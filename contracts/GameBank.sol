// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract GameBank {
    using SafeMath for uint256;
    IERC20 private _token;
    mapping(address => uint256) private _userToBalance;
    event DepositToken(address from, uint256 amount);

    constructor(address token) public {
        _token = IERC20(token);
    }

    function depositToken(uint256 amount) external {
        _userToBalance[msg.sender] = _userToBalance[msg.sender].add(amount);
        require(
            _token.transferFrom(msg.sender, address(this), amount),
            "Failed to transform"
        );
        emit DepositToken(msg.sender, amount);
    }

    function isDepositedTokens(address user, uint256 amount)
        external
        view
        returns (bool)
    {
        return _userToBalance[user] >= amount;
    }
}
