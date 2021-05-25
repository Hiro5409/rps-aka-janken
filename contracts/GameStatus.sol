// SPDX-License-Identifier: UNLICENSED

import "./IGameStatus.sol";

pragma solidity 0.6.8;

contract GameStatus is IGameStatus {
    modifier isStatusCreated(Status status) {
        require(
            status == Status.Created,
            "status is invalid, required Created"
        );
        _;
    }

    modifier isStatusJoined(Status status) {
        require(status == Status.Joined, "status is invalid, required Joined");
        _;
    }
}
