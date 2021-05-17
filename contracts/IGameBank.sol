// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./IGameStatus.sol";

interface IGameBank is IGameStatus {
    event DepositTokens(address factory, address from, uint256 amount);
    event WithdrawTokens(address factory, address from, uint256 amount);

    function betTokensAsStake(address user, uint256 amount) external;
}
