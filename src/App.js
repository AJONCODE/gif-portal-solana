import React from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';

// Importing SOLANA IDL JSON file
import idl from './idl.json';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

// SystemProgram is a reference to the core program that runs Solana.
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
let baseAccount = Keypair.generate();

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
/*
 * In this case, we simply wait for our transaction to be confirmed by the node we're connected to.
 * This is generally okay — but if we wanna be super super sure we may use something like "finalized" instead.
 * For now, let's roll with "processed".
 */
const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
// const TEST_GIFS = [
//   'https://media.giphy.com/media/Yv6RcuiyHYmn6/giphy.gif',
//   'https://media.giphy.com/media/l3q2QYwaBdjZGz1II/giphy.gif',
// 	'https://media.giphy.com/media/3o7abJW5ZuiByDelji/giphy.gif',
// ];

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = React.useState(null);
  const [inputValue, setInputValue] = React.useState("");
  const [gifList, setGifList] = React.useState([]);

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        console.info('solana: ', solana);
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          /*
           * The solana object gives us a function that will allow us to connect
           * directly with the user's wallet!
           */
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log("Connected with Public Key: ", response.publicKey.toString());

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        } else {
          alert("Solana object not found! Get a Phantom Wallet 👻");
        }
      }
    } catch(error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key: ", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length > 0) {
      console.log("Gif link: ", inputValue);
      setGifList([...gifList, inputValue]);
      setInputValue('');
    } else {
      console.log("Empty input. Try again.");
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  /*
   * Creating a provider which is an authenticated connection to Solana.
   *
   * We can't communicate with Solana at all unless we've a connected wallet.
   * We can't even retrieve data from Solana unless we have a connected wallet!
   */
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection,
      window.solana,
      opts.preflightCommitment,
    );

    return provider;
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
    } catch (error) {
      console.error("Error creating BaseAccount account:", error)
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      console.log("provider", provider);
      console.log("idl", idl);
      console.log("programID", programID);
      console.log("program", program);
      console.log("baseAccount.publicKey", baseAccount.publicKey);
      console.log("program.account.baseAccount", program.account.baseAccount);


      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.error("Error in getGifList: ", error);
      setGifList(null);
    }
  };

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't been initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button
              type="submit"
              className="cta-button submit-gif-button"
            >
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {gifList.map(gif => (
              <div className="gif-item" key={gif}>
                <img src={gif} alt={gif} />
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  React.useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  React.useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");

      // Call Solana program here
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {/* Render your connect to wallet button right here */}
          {!walletAddress && renderNotConnectedContainer()}

          {/* Render the gif container */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
