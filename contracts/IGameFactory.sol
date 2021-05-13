// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

interface IGameFactory {
    function isGameDecided(uint256 gameId) external view returns (bool);

    function isGameTied(uint256 gameId) external view returns (bool);

    function isGameWinner(uint256 gameId, address me)
        external
        view
        returns (bool);

    function getResult(uint256 gameId)
        external
        view
        returns (address loser, uint256 amount);
}
