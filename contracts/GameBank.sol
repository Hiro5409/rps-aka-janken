// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Game.sol";

contract GameBank {
    IERC20 private token;
    mapping(address => uint256) public userToBalance;

    event DepositToken(address from, address to, uint256 amount);

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

    function getGameRewards(address _gameAddress) external view {
        Game game = Game(_gameAddress);
        require(game.isPayableGameStatus(), "This game was not settled");
    }
}
