// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract GameBank {
    using SafeMath for uint256;
    IERC20 private _token;
    mapping(address => uint256) public _userToBalance;
    constructor(address token) public {
        _token = IERC20(token);
    }

    function depositToken(uint256 amount) public {
        _userToBalance[msg.sender] = _userToBalance[msg.sender].add(amount);
    }
}
