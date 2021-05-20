// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.8;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "./IGameFactory.sol";
import "./GameBank.sol";
import "./IGameBank.sol";
import "./JankenGame.sol";
import "./GameStatus.sol";

contract GameFactory is IGameFactory, JankenGame, GameStatus, AccessControl {
    bytes32 private constant GAME_MASTER_ROLE = keccak256("GAME_MASTER_ROLE");
    IGameBank private _gameBank;
    uint256 public _minBetAmount = 5;
    uint256 public _timeoutSeconds = 216000;
    Game[] public _games;

    constructor(address gameBankAddress) public {
        _gameBank = IGameBank(gameBankAddress);
        _setupRole(GAME_MASTER_ROLE, msg.sender);
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

    modifier isGameHost(address hostAddress) {
        require(
            msg.sender == hostAddress,
            "host of this game is only authorized"
        );
        _;
    }

    modifier isValidHand(
        Hand hostHand,
        bytes32 salt,
        bytes32 previousHostHandHashed
    ) {
        bytes32 currentHostHandHashed =
            keccak256(abi.encodePacked(hostHand, salt));
        require(
            currentHostHandHashed == previousHostHandHashed,
            "cannot change hand or salt later out"
        );
        _;
    }

    modifier isGameMaster() {
        require(
            hasRole(GAME_MASTER_ROLE, msg.sender),
            "Caller is not a game master"
        );
        _;
    }

    function changeTimeoutSeconds(uint256 timeoutSeconds)
        external
        override
        isGameMaster
    {
        _timeoutSeconds = timeoutSeconds;
    }

    function changeMinBetAmount(uint256 minBetAmount)
        external
        override
        isGameMaster
    {
        _minBetAmount = minBetAmount;
    }

    function isGameDecided(uint256 gameId)
        external
        view
        override
        returns (bool)
    {
        Game memory game = _games[gameId];
        return game.status == Status.Decided;
    }

    function isGameTied(uint256 gameId) external view override returns (bool) {
        Game memory game = _games[gameId];
        return game.status == Status.Tied;
    }

    function isGameWinner(uint256 gameId, address me)
        external
        view
        override
        returns (bool)
    {
        Game memory game = _games[gameId];
        return game.winner == me;
    }

    function isGamePlayer(uint256 gameId, address me)
        external
        view
        override
        returns (bool)
    {
        Game memory game = _games[gameId];
        return game.hostAddress == me || game.guestAddress == me;
    }

    function setGameStatus(uint256 gameId, Status status) external override {
        Game storage game = _games[gameId];
        game.status = status;
    }

    function createGame(uint256 betAmount, bytes32 hostHandHashed)
        external
        isSufficientMinimumBetAmount(betAmount)
        isDepositedTokens(betAmount)
    {
        uint256 gameId = _games.length;
        Game memory newGame =
            Game({
                id: gameId,
                betAmount: betAmount,
                timeoutSeconds: _timeoutSeconds,
                hostAddress: msg.sender,
                guestAddress: address(0),
                winner: address(0),
                loser: address(0),
                hostHandHashed: hostHandHashed,
                hostHand: Hand.None,
                guestHand: Hand.None,
                status: Status.Created
            });
        _games.push(newGame);
        _gameBank.betTokens(msg.sender, gameId, betAmount);

        emit GameCreated(gameId, msg.sender);
    }

    function joinGame(uint256 gameId, Hand guestHand)
        external
        isNotGameHost(_games[gameId].hostAddress)
        isStatusCreated(_games[gameId].status)
        isDepositedTokens(_games[gameId].betAmount)
    {
        Game storage game = _games[gameId];
        game.guestAddress = msg.sender;
        game.guestHand = guestHand;
        game.status = Status.Joined;
        _gameBank.betTokens(msg.sender, gameId, _games[gameId].betAmount);
        emit GameJoined(gameId, msg.sender, guestHand);
    }

    function revealHostHand(
        uint256 gameId,
        Hand hostHand,
        bytes32 salt
    )
        external
        isGameHost(_games[gameId].hostAddress)
        isStatusJoined(_games[gameId].status)
        isValidHand(hostHand, salt, _games[gameId].hostHandHashed)
    {
        Game storage game = _games[gameId];
        game.hostHand = hostHand;
        emit GameRevealed(gameId, hostHand);
        judge(gameId);
    }

    function judge(uint256 gameId) private {
        Game storage game = _games[gameId];
        (address winner, address loser) =
            playGame(
                game.hostAddress,
                game.hostHand,
                game.guestAddress,
                game.guestHand
            );

        game.status = (winner == loser ? Status.Tied : Status.Decided);
        game.winner = winner;
        game.loser = loser;
        emit GameJudged(gameId, winner, loser);
    }

    function getResult(uint256 gameId)
        external
        view
        override
        returns (
            address winner,
            address loser,
            address host,
            address guest,
            uint256 amount
        )
    {
        Game memory game = _games[gameId];
        return (
            game.winner,
            game.loser,
            game.hostAddress,
            game.guestAddress,
            game.betAmount
        );
    }
}
