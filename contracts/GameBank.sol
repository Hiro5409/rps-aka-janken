// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Game.sol";

contract GameBank {
    IERC20 private token;
    mapping(address => uint256) public userToBalance;

    event DepositToken(address from, address to, uint256 amount);
    event WithdrawTokens(address from, uint256 amount);

    constructor(address _token) public {
        token = IERC20(_token);
    }

    function depositToken(uint256 _amount) public {
        token.transferFrom(msg.sender, address(this), _amount);
        userToBalance[msg.sender] = _amount;
        emit DepositToken(msg.sender, address(this), _amount);
    }

    function isUserDepositedSufficientToken(address _user, uint256 _amount)
        public
        view
        returns (bool)
    {
        return userToBalance[_user] >= _amount;
    }

    function getGameRewards(address _gameAddress) external {
        Game game = Game(_gameAddress);
        address winner = msg.sender;
        require(game.isPayableGameStatus(), "status of this game is invalid");
        require(
            game.winnerAddress() == winner,
            "Only winner of this game gets rewards"
        );

        uint256 amount = game.betAmount();
        address loser = game.loserAddress();
        userToBalance[loser] -= amount;
        userToBalance[winner] -= amount;
        token.transfer(winner, amount * 2);
        emit WithdrawTokens(winner, amount);
        game.setStatusPaid();
    }

    function refundDepositedTokens(address _gameAddress) external {
        Game game = Game(_gameAddress);
        require(game.isTiedGame(), "This game was not tied");
    }
}
