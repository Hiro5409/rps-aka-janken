// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

contract JankenGame {
    enum Hand {Rock, Paper, Scissors}

    function playGame(
        address hostAddress,
        Hand hostHand,
        address guestAddress,
        Hand guestHand
    ) internal pure returns (address winner, address loser) {
        if (hostHand == guestHand) {
            winner = address(0);
            loser = address(0);
        } else if (hostHand == Hand.Rock && guestHand == Hand.Paper) {
            winner = guestAddress;
            loser = hostAddress;
        } else if (hostHand == Hand.Rock && guestHand == Hand.Scissors) {
            winner = hostAddress;
            loser = guestAddress;
        } else if (hostHand == Hand.Paper && guestHand == Hand.Rock) {
            winner = hostAddress;
            loser = guestAddress;
        } else if (hostHand == Hand.Paper && guestHand == Hand.Scissors) {
            winner = guestAddress;
            loser = hostAddress;
        } else if (hostHand == Hand.Scissors && guestHand == Hand.Rock) {
            winner = guestAddress;
            loser = hostAddress;
        } else if (hostHand == Hand.Scissors && guestHand == Hand.Paper) {
            winner = hostAddress;
            loser = guestAddress;
        } else {
            require(true, "host or guest hand is invalid");
        }
        return (winner, loser);
    }
}
