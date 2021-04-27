// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./Game.sol";
import "./GameBank.sol";

contract GameFactory {
    address[] private _games;

    event GameCreated(address indexed game, address indexed host);

    modifier deposited(address _gameBankAddress, uint256 _amount) {
        GameBank gameBank = GameBank(_gameBankAddress);
        require(
            gameBank.depositedSufficientToken(msg.sender, _amount),
            "Insufficient token deposited in GameBank"
        );
        _;
    }

    function createGame(
        address _gameBankAddress,
        uint256 _betAmount,
        bytes32 _hostHandHashed
    ) public deposited(_gameBankAddress, _betAmount) {
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
