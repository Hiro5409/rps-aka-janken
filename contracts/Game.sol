// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./GameStatus.sol";

contract Game is GameStatus {
    enum Hand {Rock, Paper, Scissors}
    // TODO: Change minimum BetAmount
    uint256 public constant BET_AMOUNT = 5;

    address public hostAddress;
    address public guestAddress;
    address public winnerAddress;
    bytes32 public hostHandHashed;
    Hand hostHand;
    Hand guestHand;

    bytes32 public hostSalt;

    modifier isNotHost() {
        require(
            msg.sender != hostAddress,
            "host of this game is not authorized"
        );
        _;
    }

    modifier isHost() {
        require(
            msg.sender == hostAddress,
            "only host of this game is authorized"
        );
        _;
    }

    constructor(address _hostAddress, bytes32 _hostHandHashed) public {
        hostAddress = _hostAddress;
        hostHandHashed = _hostHandHashed;
    }

    function join(Hand _guestHand) external isStatusCreated isNotHost {
        guestAddress = msg.sender;
        guestHand = _guestHand;
        setStatusReady();
    }

    function revealHostHand(Hand _hostHand, bytes32 _hostSalt)
        external
        isStatusReady
        isHost
    {
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
        setStatusDone();
    }
}
