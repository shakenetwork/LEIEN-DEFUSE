/* HTTP uses individual files. The larger bank is needed only for offline file://. */
Defuse.audioBankReady = location.protocol === "file:" ? new Promise(resolve => {
  const script = document.createElement("script");
  script.src = "js/audio-bank.js";
  script.onload = script.onerror = () => resolve();
  document.head.append(script);
}) : Promise.resolve();
