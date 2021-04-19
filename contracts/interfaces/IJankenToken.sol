// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

interface IJankenToken {
    function mint(address _account, uint256 _amount) external;

    function burn(address _account, uint256 _amount) external;
}
