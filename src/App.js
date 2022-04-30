import React, { useEffect, useState } from "react";
import "./styles/App.css";
import twitterLogo from "./assets/twitter-logo.svg";
import polygonLogo from "./assets/polygonlogo.png";
import ethLogo from "./assets/ethlogo.png";
import { ethers } from "ethers";
import { networks } from "./utils/networks";
import contractAbi from "./utils/contractAbi.json";

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
//old contract 0xE1A757400fD4E4480E605Fe9175D20D83c815218
const App = () => {
  const CONTRACT_ADDRESS = "0x35f927cEb4204571507c3C63a4792c8842317917";
  const [network, setNetwork] = useState("");
  const [account, setAccount] = useState("");
  const [domain, setDomain] = useState("");
  const [record, setRecord] = useState("");
  const [contract, setContract] = useState();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mints, setMints] = useState([]);
  const { ethereum } = window;
  const tld = ".epic";

  const connect = async () => {
    if (!ethereum) return;
    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts) return;
      setAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const init = () => {
    if (!ethereum) return;
    const _provider = new ethers.providers.Web3Provider(ethereum);
    const _signer = _provider.getSigner();
    setContract(new ethers.Contract(CONTRACT_ADDRESS, contractAbi, _signer));
  };

  const isWalletConnected = async () => {
    if (!ethereum) return;
    const accounts = await ethereum.request({ method: "eth_accounts" });
    if (!accounts) return;
    setAccount(accounts[0]);
    const chainId = await ethereum.request({ method: "eth_chainId" });
    setNetwork(networks[chainId]);
    const handleChainChanged = () => {
      window.location.reload();
    };
    ethereum.on("chainChanged", handleChainChanged);
  };

  useEffect(() => {
    isWalletConnected();
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (network === "Polygon Mumbai Testnet") {
      fetchMints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, network]);

  const addChain = async () => {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x13881",
          chainName: "Polygon Mumbai Testnet",
          rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
          nativeCurrency: {
            name: "Mumbai Matic",
            symbol: "MATIC",
            decimals: 18,
          },
          blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
        },
      ],
    });
  };

  const switchChain = async () => {
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x13881" }],
      });
    } catch (error) {
      if (error.code === 4902) {
        addChain();
      } else {
        alert(
          "MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html"
        );
      }
    }
  };

  function connectButton() {
    return (
      <div className="connect-wallet-container">
        <button onClick={connect} className="cta-button connect-wallet-button">
          Connect
        </button>
      </div>
    );
  }
  const mint = async () => {
    if (!domain || !record || !contract) return;
    if (domain.length < 2) {
      alert("domain name not available! try something Epic!");
      return;
    }
    const price =
      domain.length === 3 ? "0.5" : domain.length === 4 ? "0.3" : "0.01";
    try {
      console.log("registering");
      let tx = await contract.register(domain, {
        value: ethers.utils.parseEther(price),
      });
      const reciept = await tx.wait();
      console.log("minted!", reciept.status);
      if (reciept.status !== 1) return;
      console.log("setting record!");
      tx = await contract.setRecord(domain, record);
      await tx.wait();
      console.log("done!");
      console.log("Record set! https://mumbai.polygonscan.com/tx/" + tx.hash);
      setTimeout(() => {
        fetchMints();
      }, 2000);
      setDomain("");
      setRecord("");
      toast();
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMints = async () => {
    if (!ethereum || !contract || !account) return;
    try {
      const names = await contract.getAllNames();
      const mintRecords = await Promise.all(
        names.map(async (name) => {
          const mintRecord = await contract.records(name);
          const owner = await contract.domains(name);
          return {
            id: name.indexOf(name),
            name: name,
            record: mintRecord,
            owner: owner,
          };
        })
      );
      setMints(mintRecords);
    } catch (error) {
      console.log(error);
    }
  };

  const updateDomain = async () => {
    if (!ethereum || !domain || !record) return;
    setLoading(true);
    try {
      let tx = await contract.setRecord(domain, record);
      await tx.wait();
      console.log("Record set https://mumbai.polygonscan.com/tx/" + tx.hash);
      fetchMints();
      setRecord("");
      setDomain("");
    } catch (error) {
      alert("record not set! try again later.");
    }
    setLoading(false);
  };

  const editRecord = (name) => {
    setEditing(true);
    setDomain(name);
  };

  function renderMint() {
    if (!account && !mints) return <></>;
    return (
      <div className="mint-container">
        <p className="subtitle">Recent</p>
        <div className="mint-list">
          {mints.map((mint, index) => {
            return (
              <div className="mint-item" key={index}>
                <div className="mint-row">
                  <a
                    className="link"
                    href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <p className="underlined">
                      {" "}
                      {mint.name}
                      {tld}{" "}
                    </p>
                  </a>
                  {mint.owner.toLowerCase() === account.toLowerCase() ? (
                    <button
                      className="edit-button"
                      onClick={() => editRecord(mint.name)}
                    >
                      <img
                        className="edit-icon"
                        src="https://img.icons8.com/metro/26/000000/pencil.png"
                        alt="Edit button"
                      />
                    </button>
                  ) : (
                    <></>
                  )}
                </div>
                <p> {mint.record} </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function toast() {
    let x = document.getElementById("snackbar");
    x.className = "show";
    setTimeout(function () {
      x.className = x.className.replace("show", "");
    }, 8000);
  }

  function inputForm() {
    if (network !== "Polygon Mumbai Testnet") {
      return (
        <div className="connect-wallet-container">
          <h2>Please switch to Polygon Mumbai Testnet</h2>
          <button className="cta-button mint-button" onClick={switchChain}>
            Click here to switch
          </button>
        </div>
      );
    }
    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="tld"> {tld} </p>
        </div>
        <input
          type="text"
          value={record}
          placeholder="what type of business?"
          onChange={(e) => setRecord(e.target.value)}
        />
        {editing ? (
          <div className="button-container">
            <button
              className="cta-button mint-button"
              disabled={loading}
              onClick={updateDomain}
            >
              Set Record
            </button>
            <button
              className="cta-button mint-button"
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={mint} className="cta-button mint-button">
            mint
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">Epic Domains</p>
              <p className="subtitle">Your Domain as a service!</p>
              <p>build epic businesses</p>
            </div>
            <div className="right">
              <img
                alt="Network logo"
                className="logo"
                src={network.includes("Polygon") ? polygonLogo : ethLogo}
              />
              {account ? (
                <p>
                  {account.slice(0, 6)}...
                  {account.slice(-4)}
                </p>
              ) : (
                <p> Not connected </p>
              )}
            </div>
          </header>
        </div>
        {!account ? connectButton() : inputForm()}
        {mints && renderMint()}
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built with @${TWITTER_HANDLE}`}</a>
        </div>
        <div id="snackbar">minted successfully!</div>
      </div>
    </div>
  );
};

export default App;
