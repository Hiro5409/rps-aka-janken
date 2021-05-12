// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

contract GameStatus {
    enum Status {Created, Joined, Decided, Tied, Paid, Canceled}

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
