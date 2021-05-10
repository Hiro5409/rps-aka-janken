// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
contract GameBank {
    IERC20 private _token;
    constructor(address token) public {
        _token = IERC20(token);
    }
}
