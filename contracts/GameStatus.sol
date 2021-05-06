// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

contract GameStatus {
    enum Status {Created, Ready, Canceled, TimedOut, Decided, Tied, Paid}

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

    function isPayableGameStatus() external view returns (bool) {
        return status == Status.Decided || status == Status.TimedOut;
    }

    function isTiedGame() external view returns (bool) {
        return status == Status.Tied;
    }

    function setStatusReady() internal {
        status = Status.Ready;
    }

    function setStatusDecided() internal {
        status = Status.Decided;
    }

    function setStatusTied() internal {
        status = Status.Tied;
    }

    function setStatusPaid() external {
        status = Status.Paid;
    }
}
