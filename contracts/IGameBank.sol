// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

interface IGameBank {
    function isDepositedTokens(address from, uint256 amount)
        external
        view
        returns (bool);
}
