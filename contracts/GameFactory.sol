// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./Game.sol";

contract GameFactory {
    address[] private _games;

    event GameCreated(address indexed game, address indexed host);

    function createGame(bytes32 _hostHandHashed) public {
        Game game = new Game(msg.sender, _hostHandHashed);
        _games.push(address(game));
        emit GameCreated(address(game), msg.sender);
    }

    function games() public view returns (address[] memory collection) {
        collection = new address[](_games.length);
        for (uint256 i = 0; i < _games.length; i++) {
            collection[i] = _games[i];
        }
        return collection;
    }
}
