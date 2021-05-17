// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IGameBank.sol";
import "./IGameFactory.sol";

contract GameBank is IGameBank {
    using SafeMath for uint256;
    IERC20 private _token;
    mapping(address => mapping(address => uint256))
        public _gameUserBalanceDeposited;
    mapping(address => mapping(address => uint256))
        public _gameUserBalanceStake;

    constructor(address token) public {
        _token = IERC20(token);
    }

    function depositTokens(address game, uint256 amount) external {
        address sender = msg.sender;
        _gameUserBalanceDeposited[game][sender] = _gameUserBalanceDeposited[
            game
        ][sender]
            .add(amount);
        require(
            _token.transferFrom(sender, address(this), amount),
            "Failed to transform"
        );
        emit DepositTokens(game, sender, amount);
    }

    function betTokensAsStake(address user, uint256 amount) external override {
        uint256 depositedBalance = _gameUserBalanceDeposited[msg.sender][user];
        uint256 stakeBalance = _gameUserBalanceStake[msg.sender][user];
        require(
            depositedBalance >= amount,
            "Insufficient tokens deposited in GameBank"
        );
        _gameUserBalanceDeposited[msg.sender][user] = depositedBalance.sub(
            amount
        );
        _gameUserBalanceStake[msg.sender][user] = stakeBalance.add(amount);
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

        uint256 depositedWinnerBalance =
            _gameUserBalanceDeposited[game][winner];
        uint256 stakeWinnerBalance = _gameUserBalanceStake[game][winner];
        uint256 stakeLoserBalance = _gameUserBalanceStake[game][loser];

        require(
            stakeWinnerBalance >= amount,
            "winner should deposit and bet in advance"
        );
        require(
            stakeLoserBalance >= amount,
            "loser should deposit and bet in advance"
        );
        _gameUserBalanceStake[game][winner] = stakeWinnerBalance.sub(amount);
        _gameUserBalanceStake[game][loser] = stakeLoserBalance.sub(amount);
        _gameUserBalanceDeposited[game][winner] = depositedWinnerBalance.add(
            amount.mul(2)
        );
        gameFactory.setGameStatus(gameId, Status.Paid);
    }

    function withdrawTokens(address game, uint256 withdrawAmount) external {
        uint256 depositedBalance = _gameUserBalanceDeposited[game][msg.sender];
        require(
            depositedBalance >= withdrawAmount,
            "withdraw amount exceeds balance"
        );
        _gameUserBalanceDeposited[game][msg.sender] = depositedBalance.sub(
            withdrawAmount
        );
        require(
            _token.transfer(msg.sender, withdrawAmount),
            "fail to transfer"
        );
        emit WithdrawTokens(game, msg.sender, withdrawAmount);
    }
}
