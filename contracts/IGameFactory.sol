// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./IGameStatus.sol";
import "./IJankenGame.sol";

interface IGameFactory is IGameStatus, IJankenGame {
    struct Game {
        uint256 id;
        uint256 betAmount;
        uint256 timeoutSeconds;
        address hostAddress;
        address guestAddress;
        address winner;
        address loser;
        bytes32 hostHandHashed;
        Hand hostHand;
        Hand guestHand;
        Status status;
    }

    event GameCreated(uint256 indexed gameId, address indexed host);
    event GameJoined(
        uint256 indexed gameId,
        address indexed guest,
        Hand guestHand
    );
    event GameRevealed(uint256 indexed gameId, Hand hostHand);
    event GameJudged(
        uint256 indexed gameId,
        address indexed winner,
        address indexed loser
    );

    function isGameDecided(uint256 gameId) external view returns (bool);

    function isGameTied(uint256 gameId) external view returns (bool);

    function isGameWinner(uint256 gameId, address me)
        external
        view
        returns (bool);

    function isGamePlayer(uint256 gameId, address me)
        external
        view
        returns (bool);

    function getResult(uint256 gameId)
        external
        view
        returns (
            address winner,
            address loser,
            address host,
            address guest,
            uint256 amount
        );

    function setGameStatus(uint256 gameId, Status status) external;

    function changeTimeoutSeconds(uint256 timeoutSeconds) external;

    function changeMinBetAmount(uint256 minBetAmount) external;
}
