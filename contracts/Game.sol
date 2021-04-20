// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

contract Game {
    enum Hand {Rock, Paper, Scissors}
    enum Status {Created, Ready, Canceled, TimedOut, Done}
    // TODO: Change minimum BetAmount
    uint256 public constant BET_AMOUNT = 5;

    address public hostAddress;
    address public guestAddress;
    address public winnerAddress;
    bytes32 public hostHandHashed;
    Hand hostHand;
    Hand guestHand;

    Status status = Status.Created;

    bytes32 public hostSalt;

    constructor(address _hostAddress, bytes32 _hostHandHashed) public {
        hostAddress = _hostAddress;
        hostHandHashed = _hostHandHashed;
    }

    function join(address _guestAddress, Hand _guestHand) external {
        require(
            status == Status.Created,
            "status is invalid, required Created"
        );
        require(msg.sender != hostAddress, "host of this game cannot join");
        // approveTransferの確認

        guestAddress = _guestAddress;
        guestHand = _guestHand;
        status = Status.Ready;
    }

    function revealHostHand(Hand _hostHand, bytes32 _hostSalt) external {
        require(status == Status.Ready, "status is invalid, required Ready");
        require(msg.sender == hostAddress, "only host can reveal");

        if (
            keccak256(abi.encodePacked(_hostHand, _hostSalt)) == hostHandHashed
        ) {
            hostHand = _hostHand;
            judge();
        }
    }

    function judge() private {
        if (hostHand == guestHand) {
            // 引き分け
        } else if (hostHand == Hand.Rock && guestHand == Hand.Paper) {
            winnerAddress = guestAddress;
        } else if (hostHand == Hand.Rock && guestHand == Hand.Scissors) {
            winnerAddress = hostAddress;
        } else if (hostHand == Hand.Paper && guestHand == Hand.Rock) {
            winnerAddress = hostAddress;
        } else if (hostHand == Hand.Paper && guestHand == Hand.Scissors) {
            winnerAddress = guestAddress;
        } else if (hostHand == Hand.Scissors && guestHand == Hand.Rock) {
            winnerAddress = guestAddress;
        } else if (hostHand == Hand.Scissors && guestHand == Hand.Paper) {
            winnerAddress = hostAddress;
        }
        status = Status.Done;
    }
}
