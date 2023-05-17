(function() {
    if (window.__myBookmarkletObserver) {
      window.__myBookmarkletObserver.disconnect();
      console.log('Deactivating prior instance of the bookmarklet');
    }
  
    var targetSelector = '.prose > *';
    var speakQueue = [];
    var isSpeaking = false;
  
    var getBestVoice = () => {
      var voices = window.speechSynthesis.getVoices();
      var preferredVoices = [
          // Chrome
          'Google UK English Female',
          'Google UK English Male',
          'Fiona', 
          'Moira',
          'Alex',
          'Daniel',
  
          // 'Thomas',
  
          // iPhone
          // en-GB
          'Melina', // en-GB
          'Tessa',
          'Karen', // en-GB
          'Rocko', // en-GB
          'Ralph', // en-GB
          'Moira', // en-GB
          // 
  
          // Funny
          'Organ',
          'Cellos',
          'Jester',
          'Bells', // en-us
          'Trinoids',
  
          'Google US English',
          'en-US'
          ];
      for (var preferredVoice of preferredVoices) {
        var voice = voices.find((voice) => voice.lang.match(/^en/) && voice.name === preferredVoice);
        if (voice) {
          console.log('Chose Voice: '+ preferredVoice);
          return voice;
        }
      }
      return voices[0];
    };
  
  let spokenText = '';
  let resumeTimer = null 
  
  function speak(text) {
    spokenText += ' ' + text;
  
    var speechSynthesis = window.speechSynthesis;
    speechSynthesis.cancel();
    console.log('Stopping any ongoing speech instances');
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Change this value to adjust the speech rate
    utterance.voice = getBestVoice();
    console.log('Starting to speak:', text);
    speechSynthesis.cancel();
    clearInterval(resumeTimer)
    speechSynthesis.speak(utterance);
    resumeTimer = setInterval(() => {
      console.log(speechSynthesis.speaking);
      if (!speechSynthesis.speaking) {
        clearInterval(resumeTimer);
      } else {
        console.log("Resuming Speech...");
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 14000);
  }
  
  function speakNotRepeated(newText) {
    const lastWordRegex = /(\b\w+\b)\W*$/;
    const nextWordRegex = /^\W*(\b\w+\b)/;
    const lastSpokenWordMatch = spokenText.match(lastWordRegex);
    const lastSpokenWord = lastSpokenWordMatch ? lastSpokenWordMatch[1].toLowerCase() : null;
  
    if (!lastSpokenWord || newText.indexOf(lastSpokenWord) === -1) {
      console.log(`Speaking ALL text (first time, or last spoken word [${lastSpokenWord}] is not in text): ${newText}`);
      speak(newText);
      return true;
    }
  
  
    let inputWords = [];
    let match;
    let lastWords = [lastSpokenWord];
    let remainingSpokenText = spokenText.slice(0,spokenText.length - lastSpokenWordMatch[0].length)
    let foundMatch = false;
    let remainingText = newText;
  
    while ((match = nextWordRegex.exec(remainingText)) !== null) {
      const nextWord = match[1].toLowerCase();
      inputWords.push(nextWord);
      remainingText = remainingText.slice(match[0].length + 1);
      // console.log(`[NO_REPEAT] Next Word: ${nextWord}`)
      // console.log(`[NO_REPEAT] Remaining: ${remainingText}`)
  
      if (nextWord == lastSpokenWord) {
        let foundNonMatch = false;
        let crawlbackWords = [... lastWords];
        
        for(let crawlBackIndex = 0; remainingSpokenText.match(/\w/) && crawlBackIndex < inputWords.length ; crawlBackIndex++) {
          let crawlBackWord = crawlbackWords.shift();
          if ( crawlBackWord === undefined ) {
            const lastSpokRemainingWordMatch = remainingSpokenText.match(lastWordRegex);
            const lastSpokRemainingWord = lastSpokRemainingWordMatch ? lastSpokRemainingWordMatch[1].toLowerCase() : null;
          
            if (!lastSpokRemainingWord) {
              break;
            }
            lastWords.push(lastSpokRemainingWord)
            crawlBackWord = lastSpokRemainingWord;
            remainingSpokenText = remainingSpokenText.slice(0,remainingSpokenText.length - lastSpokRemainingWordMatch[0].length)
          }
  
          if (crawlBackWord != inputWords[inputWords.length - 1 - crawlBackIndex]) {
            foundNonMatch = true;
            break;
          }
        }
  
        if ( ! foundNonMatch ) {
          foundMatch = true;
          break;
        }
      }
    }
  
    if (foundMatch) {
      if (remainingText.match(/\w/)) {
        console.log(`Speaking Partial text: ${remainingText}`);
        speak(remainingText);
        return true;
      } else {
        return false;
      }
    } else {
      console.log(`Speaking ALL text: ${newText}`);
      speak(newText);
      return true;
    }
  }
  
    var processSpeakQueue = () => {
      console.log()
      if (isSpeaking || speakQueue.length === 0) return;
      isSpeaking = true;
      var { text, element, version } = speakQueue[0];
  
      let skip = false;
      if (!element.parentElement) {
        skip = true;
        console.log("[Skipping]: Weirdo, no parent element"+ element.innerText)
      }
      if (skip) {
        isSpeaking = false;
        speakQueue.shift();
        processSpeakQueue();
        return;
      }
  
      if ( element.__version !== version ) {
        console.log("Older version: "+ version +", final one is: "+ element.__version)
        speakQueue.shift();
        isSpeaking = false;
        processSpeakQueue();
        return;
      }
  
      if ( (!element.__shortWaited || element.__shortWaited < 3) && text.length < 30 ) {
        console.log("Too Short, wait a second... ["+ text +"]")
        console.log(element)
        console.log(element.parentElement)
        element.__shortWaited = element.__shortWaited ? element.__shortWaited + 1 : 1
        setTimeout(() => {
          console.log("Now, Keep Speaking...")
          isSpeaking = false;
          processSpeakQueue();
        },1000);
        return;
      }
  
      const actuallyDidSpeak = speakNotRepeated(text)
      if (actuallyDidSpeak) {
  
        var checkSpeechEnd = () => {
          if (isSpeechOngoing()) {
            console.log("Waiting for Speech to end...")
            setTimeout(checkSpeechEnd, 1000);
          } else {
            console.log("Done Speaking: "+ speakQueue.length +" items left in queue")
            isSpeaking = false;
            speakQueue.shift();
            element.__read = true;
            processSpeakQueue();
          }
        };
  
        setTimeout(checkSpeechEnd, 100);
  
        // utterance.onend = () => {
        //   console.log("Done Speaking: "+ speakQueue.length +" items left in queue")
        //   isSpeaking = false;
        //   element.__read = true;
        //   processSpeakQueue();
        // };
      }
      else {
        console.log(`[SKIPPING ]Non-Repeat filter says this has already been completely been said: ${text}`)
        isSpeaking = false;
        speakQueue.shift();
        element.__read = true;
        processSpeakQueue();
      }
    };
  
    var isSpeechOngoing = () => {
      return window.speechSynthesis.speaking || window.speechSynthesis.pending;
    };
  
    var addToSpeakQueue = (text, element, version) => {
      if (!element.__read) {
        speakQueue.push({ text, element, version });
        processSpeakQueue();
      }
    };
  
    var handleNewElement = (element) => {
      var proseParent = element.closest('.prose');
      if (proseParent) {
        // var targetElement = element.parentElement === proseParent ? element : element.closest('.prose > *');
        // console.log(`New node detected [not parent = ${targetElement === element}]:`, targetElement);
        var targetElement = element
        var text = targetElement.innerText;
        if (targetElement.tagName.toLowerCase() === 'pre') text = 'skip, code block here.'
  
        var version = typeof targetElement.__version === "undefined" ? 0 : targetElement.__version;
        targetElement.__version = version + 1;
        addToSpeakQueue(text, targetElement, version + 1);
        observeElement(targetElement);
      }
    };
  
    var handleChangedElement = (element) => {
      console.log('Changed element detected:', element);
      var text = element.innerText;
        if (element.tagName.toLowerCase() === 'pre') text = 'skip, code block here.'
      var version = typeof element.__version === "undefined" ? 0 : element.__version;
      element.__version = version + 1;
      element.__read = false
      addToSpeakQueue(text, element, version + 1);
    };
  
    var observeElement = (element) => {
      var elementObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                handleChangedElement(element);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                var matchingElements = node.matches(targetSelector) ? [node] : node.querySelectorAll(targetSelector);
                matchingElements.forEach((element) => {
                  handleNewElement(element);
                });
              }
            });
          }
          if (mutation.type === 'characterData') {
            handleChangedElement(element);
          }
        });
      });
      elementObserver.observe(element, { childList: true, subtree: true, characterData: true });
    };
  
    var observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              var matchingElements = node.matches(targetSelector) ? [node] : node.querySelectorAll(targetSelector);
              matchingElements.forEach((element) => {
                handleNewElement(element);
              });
            }
          });
        }
      });
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  
  
    function stopSpeaking() {
      window.speechSynthesis.cancel();
      speakQueue = [];
    }
  
    function createStopButton() {
      const stopButton = document.createElement('button');
      stopButton.textContent = 'Stop';
      stopButton.style.color = 'red';
      stopButton.style.position = 'fixed';
      stopButton.style.right = '10px';
      stopButton.style.top = '50%';
      stopButton.style.zIndex = 1000;
      stopButton.style.backgroundColor = '#fff';
      stopButton.style.border = '1px solid #000';
      stopButton.style.borderRadius = '4px';
      stopButton.style.padding = '4px 8px';
      stopButton.style.fontSize = '14px';
      stopButton.style.cursor = 'pointer';
      stopButton.addEventListener('click', stopSpeaking);
  
      document.body.appendChild(stopButton);
      return stopButton;
    }
  
    function removeStopButton(stopButton) {
      if (stopButton && stopButton.parentNode) {
        stopButton.parentNode.removeChild(stopButton);
      }
    }
  
    // Remove the current stop button (if any) and create a new one when the bookmarklet is run
    if (window.currentStopButton) {
      removeStopButton(window.currentStopButton);
    }
    window.currentStopButton = createStopButton();
  
    setTimeout(() => { speak("Speak GPT now enabled") }, 500)
  
    window.__myBookmarkletObserver = observer;
  })();
  ``
  