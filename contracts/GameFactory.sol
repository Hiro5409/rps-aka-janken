// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "./GameBank.sol";
import "./IGameBank.sol";
import "./JankenGame.sol";

contract GameFactory is JankenGame {
    IGameBank private _gameBank;
    uint256 private constant _minBetAmount = 5;
    uint256 private constant _timeoutSeconds = 216000;
    Game[] public _games;
    struct Game {
        uint256 id;
        uint256 betAmount;
        uint256 timeoutSeconds;
        address hostAddress;
        address guestAddress;
        bytes32 hostHandHashed;
    }

    event GameCreated(uint256 indexed gameId, address indexed host);

    constructor(address gameBankAddress) public {
        _gameBank = IGameBank(gameBankAddress);
    }

    modifier isSufficientMinimumBetAmount(uint256 betAmount) {
        require(betAmount >= _minBetAmount, "requried minimum bet amount");
        _;
    }

    modifier isDepositedTokens(uint256 _amount) {
        require(
            _gameBank.isDepositedTokens(msg.sender, _amount),
            "Insufficient tokens deposited in GameBank"
        );
        _;
    }

    modifier isNotGameHost(address hostAddress) {
        require(
            msg.sender != hostAddress,
            "host of this game is not authorized"
        );
        _;
    }

    function createGame(uint256 betAmount, bytes32 hostHandHashed)
        external
        isSufficientMinimumBetAmount(betAmount)
        isDepositedTokens(betAmount)
    {
        uint256 gameId = _games.length;
        Game memory newGame;
        newGame.id = gameId;
        newGame.betAmount = betAmount;
        newGame.timeoutSeconds = _timeoutSeconds;
        newGame.hostAddress = msg.sender;
        newGame.hostHandHashed = hostHandHashed;
        _games.push(newGame);

        emit GameCreated(gameId, msg.sender);
    }

    function joinGame(uint256 gameId, Hand guestHand)
        external
        isNotGameHost(_games[gameId].hostAddress)
        isDepositedTokens(_games[gameId].betAmount)
    {}
}
