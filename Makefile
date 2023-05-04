.PHONY: compile

compile:
	@uglifyjs SpeakGPT.js -m -c -o SpeakGPT.min.js
	@echo "javascript:"`node -e "console.log(encodeURIComponent(require('fs').readFileSync('SpeakGPT.min.js', 'utf8')))"` > bookmarklet.txt
	cat bookmarklet.txt | pbcopy
	@echo "Copied bookmarklet to clipboard"
