import twitterLogo from "./assets/twitter-logo.svg";
import { useEffect, useState } from "react";
import "./App.css";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import idl from "./idl.json";
import kp from "./keypair.json";

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Utilize keypair from keypai.json that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl("devnet");

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
	preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "0xJosephRoyal";
const TWITTER_LINK = `https://twitter.com/0xJosephRoyal`;

const TEST_GIFS = [
	"https://media.giphy.com/media/6swcfDQHr3UTm/giphy.gif",
	"https://media.giphy.com/media/YVo52twuQhSE0/giphy.gif",
	"https://media.giphy.com/media/iR7CXoOGlv8hG/giphy.gif",
	"https://media.giphy.com/media/abgxkEiJQjaSY/giphy.gif",
	"https://media.giphy.com/media/CbLiD6gmoadi0/giphy.gif",
	"https://media.giphy.com/media/y5ZmWdzXf5pNm/giphy.gif",
];

const App = () => {
	// State
	const [walletAddress, setWalletAddress] = useState(null);
	const [inputValue, setInputValue] = useState("");
	const [gifList, setGifList] = useState([]);

	/*
	 * This function holds the logic for deciding if a Phantom Wallet is
	 * connected or not
	 */

	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window;

			if (solana) {
				if (solana.isPhantom) {
					console.log("Phantom wallet found!");
					const response = await solana.connect({ onlyIfTrusted: true });
					console.log(
						"Connected with Public Key:",
						response.publicKey.toString()
					);
					/*
					 * Set the user's publicKey in state to be used later!
					 */
					setWalletAddress(response.publicKey.toString());
				}
			} else {
				alert("Solana object not found! Get a Phantom Wallet 👻");
			}
		} catch (error) {
			console.error(error);
		}
	};

	/*
	 * We've defined 'connectWallet' here so that our code does not break.
	 */
	const connectWallet = async () => {
		const { solana } = window;

		if (solana) {
			const response = await solana.connect();
			console.log("Connected with Public Key:", response.publicKey.toString());
			setWalletAddress(response.publicKey.toString());
		}
	};

	/*
	 * This is neccessary for input parameter "onInputChange" found below.
	 */
	const onInputChange = (event) => {
		const { value } = event.target;
		setInputValue(value);
	};

	/*
	 * This creates a provider which is an authenticated connection to Solana.
	 */
	const getProvider = () => {
		const connection = new Connection(network, opts.preflightCommitment);
		const provider = new Provider(
			connection,
			window.solana,
			opts.preflightCommitment
		);
		return provider;
	};

	const sendGif = async () => {
		if (inputValue.length === 0) {
			console.log("No gif link given!");
			return;
		}
		console.log("Gif link:", inputValue);
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);

			await program.rpc.addGif(inputValue, {
				accounts: {
					baseAccount: baseAccount.publicKey,
				},
			});
			console.log("GIF sucesfully sent to program", inputValue);

			await getGifList();
		} catch (error) {
			console.log("Error sending GIF:", error);
		}
	};

	/*
	 * We want to render this UI when the user hasn't connected
	 * their wallet to our app yet.
	 */
	const renderNotConnectedContainer = () => (
		<button
			className='cta-button connect-wallet-button'
			onClick={connectWallet}
		>
			Connect to Wallet
		</button>
	);

	/*
	 * We also want to render this UI when the user has connected
	 * their wallet to our app. This will have some simple UI code that will map through all our GIF links and render them.
	 */
	const renderConnectedContainer = () => {
		// If we hit this, it means the program account hasn't be initialized.
		if (gifList === null) {
			return (
				<div className='connected-container'>
					<button
						className='cta-button submit-gif-button'
						onClick={createGifAccount}
					>
						Do One-Time Initialization For GIF Program Account
					</button>
				</div>
			);
		}
		// Otherwise, we're good! Account exists. User can submit GIFs.
		else {
			return (
				<div className='connected-container'>
					<input
						type='text'
						placeholder='Enter gif link!'
						value={inputValue}
						onChange={onInputChange}
					/>
					<button className='cta-button submit-gif-button' onClick={sendGif}>
						Submit
					</button>
					<div className='gif-grid'>
						{/* We use index as the key instead, also, the src is now item.gifLink */}
						{gifList.map((item, index) => (
							<div className='gif-item' key={index}>
								<img src={item.gifLink} alt='' />
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
	 * UseEffects Below
	 */
	useEffect(() => {
		window.addEventListener("load", async (event) => {
			await checkIfWalletIsConnected();
		});
	}, []);

	const getGifList = async () => {
		try {
			const provider = getProvider();
			const program = new Program(idl, programID, provider);
			const account = await program.account.baseAccount.fetch(
				baseAccount.publicKey
			);

			console.log("Got the account", account);
			setGifList(account.gifList);
		} catch (error) {
			console.log("Error in getGifs: ", error);
			setGifList(null);
		}
	};
	/*
	 * This useEffect gets called when our walletAddress state changes
	 */
	useEffect(() => {
		if (walletAddress) {
			console.log("Fetching GIF list...");
			// Set state
			getGifList();
		}
	}, [walletAddress]);

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
			console.log(
				"Created a new BaseAccount w/ address:",
				baseAccount.publicKey.toString()
			);
			await getGifList();
		} catch (error) {
			console.log("Error creating BaseAccount account:", error);
		}
	};

	return (
		<div className='App'>
			{/* This was solely added for some styling fanciness */}
			<div className={walletAddress ? "authed-container" : "container"}>
				{/* <div className="container"> */}
				<div className='header-container'>
					<p className='header'>🏎 Welcome Home, Car Enthusiasts </p>
					<p className='sub-text'>
						We <i>swoon</i> for all things <em>vroom</em>.
						<p className='sub-text'>
							{" "}
							Connect your wallet and drop your best car GIF on to our{" "}
							<b>Metaverse</b> collection 👇{" "}
						</p>
					</p>
					{/* Add the condition to show this only if we don't have a wallet address */}
					{!walletAddress && renderNotConnectedContainer()}
					{/* Add this condition to show this only if we do have a wallet address :) */}
					{walletAddress && renderConnectedContainer()}
				</div>
				<div className='footer-container'>
					<img alt='Twitter Logo' className='twitter-logo' src={twitterLogo} />
					<a
						className='footer-text'
						href={TWITTER_LINK}
						target='_blank'
						rel='noreferrer'
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
};

export default App;
