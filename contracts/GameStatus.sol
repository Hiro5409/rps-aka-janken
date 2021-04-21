// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

contract GameStatus {
    enum Status {Created, Ready, Canceled, TimedOut, Done}

    Status public status = Status.Created;

    modifier isStatusCreated() {
        require(
            status == Status.Created,
            "status is invalid, required Created"
        );
        _;
    }

    modifier isStatusReady() {
        require(status == Status.Ready, "status is invalid, required Ready");
        _;
    }

    function setStatusReady() internal {
        status = Status.Ready;
    }

    function setStatusDone() internal {
        status = Status.Done;
    }
}
