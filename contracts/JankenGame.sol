// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

contract JankenGame {
    enum Hand {Rock, Paper, Scissors}
    enum Result {Win, Lose, Draw}

    mapping(Hand => mapping(Hand => Result)) private results;

    constructor() public {
        results[Hand.Rock][Hand.Rock] = Result.Draw;
        results[Hand.Rock][Hand.Paper] = Result.Lose;
        results[Hand.Rock][Hand.Scissors] = Result.Win;

        results[Hand.Paper][Hand.Paper] = Result.Draw;
        results[Hand.Paper][Hand.Scissors] = Result.Lose;
        results[Hand.Paper][Hand.Rock] = Result.Win;

        results[Hand.Scissors][Hand.Scissors] = Result.Draw;
        results[Hand.Scissors][Hand.Rock] = Result.Lose;
        results[Hand.Scissors][Hand.Paper] = Result.Win;
    }

    function playGame(
        address hostAddress,
        Hand hostHand,
        address guestAddress,
        Hand guestHand
    ) internal view returns (address winner, address loser) {
        Result result = results[hostHand][guestHand];

        if (result == Result.Draw) {
            winner = address(0);
            loser = address(0);
        } else if (result == Result.Win) {
            winner = hostAddress;
            loser = guestAddress;
        } else {
            winner = guestAddress;
            loser = hostAddress;
        }
        return (winner, loser);
    }
}
