// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

interface IGameStatus {
    enum Status {Created, Joined, Decided, Tied, Paid, Canceled}
}
