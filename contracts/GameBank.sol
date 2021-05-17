// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IGameBank.sol";
import "./IGameFactory.sol";

contract GameBank is IGameBank {
    using SafeMath for uint256;
    IERC20 private _token;
    mapping(address => mapping(address => uint256)) public _gameToUserBalance;

    constructor(address token) public {
        _token = IERC20(token);
    }

    function depositToken(address game, uint256 amount) external {
        address sender = msg.sender;
        _gameToUserBalance[game][sender] = _gameToUserBalance[game][sender].add(
            amount
        );
        require(
            _token.transferFrom(sender, address(this), amount),
            "Failed to transform"
        );
        emit DepositTokens(game, sender, amount);
    }

    function isDepositedTokens(address user, uint256 amount)
        external
        view
        override
        returns (bool)
    {
        return _gameToUserBalance[msg.sender][user] >= amount;
    }

    function getGameRewards(address game, uint256 gameId) external {
        IGameFactory gameFactory = IGameFactory(game);
        require(
            gameFactory.isGameDecided(gameId),
            "status is invalid, required Decided"
        );
        require(gameFactory.isGameWinner(gameId, msg.sender), "you are loser");

        address winner = msg.sender;
        (address loser, uint256 amount) = gameFactory.getResult(gameId);

        require(
            _gameToUserBalance[game][winner] >= amount,
            "winner should deposit stakes in advance"
        );
        require(
            _gameToUserBalance[game][loser] >= amount,
            "loser should deposit stakes in advance"
        );
        _gameToUserBalance[game][winner] = _gameToUserBalance[game][winner].sub(
            amount
        );
        _gameToUserBalance[game][loser] = _gameToUserBalance[game][loser].sub(
            amount
        );

        require(_token.transfer(winner, amount * 2), "fail to transfer");

        gameFactory.setGameStatus(gameId, Status.Paid);
    }

    function withdrawTokens(address game, uint256 withdrawAmount) external {
        uint256 userBalance = _gameToUserBalance[game][msg.sender];
        require(
            userBalance >= withdrawAmount,
            "withdraw amount exceeds balance"
        );
        _gameToUserBalance[game][msg.sender] = userBalance.sub(withdrawAmount);
        require(
            _token.transfer(msg.sender, withdrawAmount),
            "fail to transfer"
        );
        emit WithdrawTokens(game, msg.sender, withdrawAmount);
    }
}
