(function() {
    if (window.__myBookmarkletObserver) {
      window.__myBookmarkletObserver.disconnect();
      console.log('Deactivating prior instance of the bookmarklet');
    }
  
    var targetSelector = '.prose > *';
    var speakQueue = [];
    var isSpeaking = false;
 
    // Define your reference and count at the start of your script.
    var firstConversationItem = document.querySelector(targetSelector);
    var conversationCount = document.querySelectorAll(targetSelector).length;
    var ignoreEventsUntil = null;

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
  
      if ( (!element.__shortWaited || element.__shortWaited < 3) && text.length < 30 && speakQueue.length == 1 ) {
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
        var text = scrubConversationContent(element);
  
        var version = typeof targetElement.__version === "undefined" ? 0 : targetElement.__version;
        targetElement.__version = version + 1;
        addToSpeakQueue(text, targetElement, version + 1);
        observeElement(targetElement);
      }
    };

    var detectAndWaitIfConversationSwitched = () => {
      if (ignoreEventsUntil !== null && ignoreEventsUntil > Date.now()) { return true; }
      else { ignoreEventsUntil = null; } 

      // If we have detected that the conversation has changed (i.e. the first conversation item has changed)
      var newFirstConversationItem = document.querySelector(targetSelector);
      var newConversationCount = document.querySelectorAll(targetSelector).length;
      if (newFirstConversationItem !== firstConversationItem && (newConversationCount < conversationCount || newConversationCount == 0 || newConversationCount > 2)) {
        console.log('Conversation has changed, resetting');
        firstConversationItem = newFirstConversationItem;
        conversationCount = newConversationCount;
        speakQueue = [];
        isSpeaking = false;
        // stop speaking, if a read is in progress
        window.speechSynthesis.cancel();
        ignoreEventsUntil = Date.now() + 2000;
        return true;
      }

      return false;
    }
  
    var handleChangedElement = (element) => {
      console.log('Changed element detected:', element);
      var text = scrubConversationContent(element);
      var version = typeof element.__version === "undefined" ? 0 : element.__version;
      element.__version = version + 1;
      element.__read = false
      addToSpeakQueue(text, element, version + 1);
    };
  
    var observeElement = (element) => {
      var elementObserver = new MutationObserver((mutations) => {
        if ( detectAndWaitIfConversationSwitched() ) { return; }
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
      if ( detectAndWaitIfConversationSwitched() ) { return; }
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
  
    
    ////////////////////////////
    ///  Stop and Repeat Buttons

    function stopSpeaking() {
      window.speechSynthesis.cancel();
      speakQueue = [];
    }

    function scrubConversationContent(element) {
      var text = element.innerText;
      if (element.tagName.toLowerCase() === 'pre') text = 'skip, code block here.'
      return text;
    }

    function repeatLastResponse() {
      stopSpeaking();
      spokenText = '';
      var lastResponse = Array.from(document.querySelectorAll('.prose')).pop();
      if (lastResponse) {
        // Get array of only the immediate children of the last response
        var innerElements = Array.from(lastResponse.children);
        innerElements.forEach((element, index) => {
          var text = scrubConversationContent(element);
          console.log(`Repeating: ${text}`);
          var version = typeof element.__version === "undefined" ? 0 : element.__version;
          element.__version = version + 1;
          element.__read = false
          addToSpeakQueue(text, element, version + 1);
        });
      } else {
        console.log("No previous response found");
      }
    }

    function createButton(textContent, textColor, clickHandler) {
      const button = document.createElement('button');
      button.textContent = textContent;
      button.style.color = textColor;
      button.style.position = 'fixed';
      button.style.right = '10px';
      button.style.top = '50%';
      button.style.zIndex = 1000;
      button.style.backgroundColor = '#fff';
      button.style.border = '1px solid #000';
      button.style.borderRadius = '4px';
      button.style.padding = '4px 8px';
      button.style.fontSize = '14px';
      button.style.cursor = 'pointer';
      button.addEventListener('click', clickHandler);
    
      return button;
    }

    function createButtons() {
      const stopButton = createButton('Stop', 'red', stopSpeaking);
      const repeatButton = createButton('Repeat', 'blue', repeatLastResponse);


      document.body.appendChild(stopButton);
      document.body.appendChild(repeatButton);
      setTimeout(() => {
        let parentHeight = stopButton.parentElement.offsetHeight;
        let stopButtonTopPercentage = parseFloat(stopButton.style.top); // Assuming it's a percentage
        let stopButtonTopPixels = (stopButtonTopPercentage / 100) * parentHeight;
        
        repeatButton.style.top = (stopButtonTopPixels + 50) + 'px';
      }, 500)

      return [stopButton, repeatButton];
    }

    function removeButtons(buttons) {
      buttons.forEach((button) => {
        if (button && button.parentNode) {
          button.parentNode.removeChild(button);
        }
      });
    }

    // Remove the current buttons (if any) and create new ones when the bookmarklet is run
    if (window.currentButtons) {
      removeButtons(window.currentButtons);
    }
    window.currentButtons = createButtons();
      
    setTimeout(() => { speak("Speak GPT now enabled") }, 500)
  
    window.__myBookmarkletObserver = observer;
  })();
  ``
  