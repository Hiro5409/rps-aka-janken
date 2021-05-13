// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IGameFactory.sol";

contract GameBank {
    using SafeMath for uint256;
    IERC20 private _token;
    mapping(address => mapping(address => uint256)) public _gameToUserBalance;
    event DepositToken(address factory, address from, uint256 amount);

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
        emit DepositToken(game, sender, amount);
    }

    function isDepositedTokens(address user, uint256 amount)
        external
        view
        returns (bool)
    {
        return _gameToUserBalance[msg.sender][user] >= amount;
    }

    function getGameRewards(address factory, uint256 gameId) external {
        IGameFactory gameFactory = IGameFactory(factory);
        require(
            gameFactory.isGameDecided(gameId),
            "status is invalid, required Decided"
        );
        require(gameFactory.isGameWinner(gameId, msg.sender), "you are loser");

        address winner = msg.sender;
        (address loser, uint256 amount) = gameFactory.getResult(gameId);

        require(
            _gameToUserBalance[factory][winner] >= amount,
            "winner should deposit stakes in advance"
        );
        require(
            _gameToUserBalance[factory][loser] >= amount,
            "loser should deposit stakes in advance"
        );
        _gameToUserBalance[factory][winner] = _gameToUserBalance[factory][
            winner
        ]
            .sub(amount);
        _gameToUserBalance[factory][loser] = _gameToUserBalance[factory][loser]
            .sub(amount);
        require(_token.transfer(winner, amount * 2), "fail to transfer");
    }
}
