const MINT_AMOUNT = 100;
const BET_AMOUNT = 5;
const SALT = web3.utils.toHex('Thank you');

const HAND = {
  Rock: 0,
  Paper: 1,
  Scissors: 2,
};

const STATUS = {
  Created: 0,
  Joined: 1,
  Decided: 2,
  Tied: 3,
  Paid: 4,
  Canceled: 5,
}

const getHashedHand = (hostHand, salt) => web3.utils.soliditySha3(
  {
    type: 'uint8',
    value: hostHand,
  },
  {
    type: 'bytes32',
    value: salt,
  }
);

module.exports = {
  MINT_AMOUNT,
  BET_AMOUNT,
  SALT,
  HAND,
  STATUS,
  getHashedHand,
};
