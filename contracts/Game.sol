// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./GameStatus.sol";
import "./GameBank.sol";

contract Game is GameStatus {
    event GameJoined(address indexed guest, Hand guestHand);
    event GameRevealed(Hand hostHand);
    event GameJudged(
        address indexed winnerAddress,
        address indexed loserAddress
    );
    enum Hand {Rock, Paper, Scissors}
    uint256 public timeGameJudged;
    uint256 public timeoutSeconds;
    address public gameBankAddress;
    address public hostAddress;
    address public guestAddress;
    address public winnerAddress;
    address public loserAddress;
    bytes32 public hostHandHashed;
    uint256 public betAmount;
    Hand public hostHand;
    Hand public guestHand;

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

    modifier isWinner() {
        require(
            msg.sender == winnerAddress,
            "only winner of this game is authorized"
        );
        _;
    }

    modifier isValidHand(Hand _hostHand, bytes32 _hostSalt) {
        require(
            keccak256(abi.encodePacked(_hostHand, _hostSalt)) == hostHandHashed,
            "cannot change hand or salt later out"
        );
        _;
    }

    modifier isUserDepositedSufficientToken(
        address _gameBankAddress,
        uint256 _amount
    ) {
        GameBank gameBank = GameBank(_gameBankAddress);
        require(
            gameBank.isUserDepositedSufficientToken(msg.sender, _amount),
            "Insufficient token deposited in GameBank"
        );
        _;
    }

    constructor(
        address _hostAddress,
        uint256 _betAmount,
        uint256 _timeoutSeconds,
        bytes32 _hostHandHashed,
        address _gameBankAddress
    ) public {
        hostAddress = _hostAddress;
        hostHandHashed = _hostHandHashed;
        timeoutSeconds = _timeoutSeconds;
        betAmount = _betAmount;
        gameBankAddress = _gameBankAddress;
    }

    function join(Hand _guestHand)
        external
        isStatusCreated
        isNotHost
        isUserDepositedSufficientToken(gameBankAddress, betAmount)
    {
        guestAddress = msg.sender;
        guestHand = _guestHand;
        setStatusReady();
        emit GameJoined(msg.sender, _guestHand);
    }

    function revealHostHand(Hand _hostHand, bytes32 _hostSalt)
        external
        isStatusReady
        isHost
        isValidHand(_hostHand, _hostSalt)
    {
        hostHand = _hostHand;
        emit GameRevealed(_hostHand);
        judge();
    }

    function judge() private {
        if (hostHand == guestHand) {
            winnerAddress = address(0);
            loserAddress = address(0);
            setStatusTied();
        } else {
            if (hostHand == Hand.Rock && guestHand == Hand.Paper) {
                winnerAddress = guestAddress;
                loserAddress = hostAddress;
            } else if (hostHand == Hand.Rock && guestHand == Hand.Scissors) {
                winnerAddress = hostAddress;
                loserAddress = guestAddress;
            } else if (hostHand == Hand.Paper && guestHand == Hand.Rock) {
                winnerAddress = hostAddress;
                loserAddress = guestAddress;
            } else if (hostHand == Hand.Paper && guestHand == Hand.Scissors) {
                winnerAddress = guestAddress;
                loserAddress = hostAddress;
            } else if (hostHand == Hand.Scissors && guestHand == Hand.Rock) {
                winnerAddress = guestAddress;
                loserAddress = hostAddress;
            } else if (hostHand == Hand.Scissors && guestHand == Hand.Paper) {
                winnerAddress = hostAddress;
                loserAddress = guestAddress;
            }
            setStatusDecided();
        }
        timeGameJudged = block.timestamp;
        emit GameJudged(winnerAddress, loserAddress);
    }

    function isPayableGameStatus() external view returns (bool) {
        return
            status == Status.Tied ||
            status == Status.Decided ||
            status == Status.TimedOut;
    }
}
