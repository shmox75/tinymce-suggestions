
tinymce.PluginManager.add('suggestions', function(editor) {    

    const searchFunction = editor.getParam("search_function", null);
    const debounceTime = editor.getParam("debounce_time", 250); //ms
    const suggestionTextColor = editor.getParam("suggestion_text_color", '#dee7f1'); //hex
    const suggestionNodeId = editor.getParam("suggestion_node_id", 'suggestionNodeId');
    const minLengthSearch = editor.getParam("min_search_length", 3);
    const terms_list = editor.getParam("terms_list", []);

    let suggestionNode;
	let waiting = false;
	let waitingText;

    const excludedKeys = [
        'Space',
        'Enter',
        'NumpadEnter',
        'Delete',
        'Escape'      
    ]

    const neutralKeys = [
        'ShiftLeft',
        'ShiftRight',
        'AltRight',
        'AltLeft',
        'ControlLeft',
        'ControlRight'
    ]

    function debounce(cb, delay = debounceTime) {
        let timeout

        return (...args) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
            cb(...args)
            }, delay)
        }
    }

    async function findWord( txt ) {
        if(searchFunction == null){
            return terms_list.find(elm => elm.toLocaleLowerCase().startsWith(txt.toLocaleLowerCase()));
        }else{
            let result = await searchFunction(txt);

            if(Array.isArray(result)){
                return result.find(elm => elm.toLocaleLowerCase().startsWith(txt.toLocaleLowerCase()));
            }else{
                return result.toLocaleLowerCase().startsWith(txt.toLocaleLowerCase()) ? result : undefined
            }
        }     
    }

    function cancelEvent(e){
        e.stopPropagation();
        e.preventDefault();
    }

    function removeSuggestionNode(){
        suggestionNode && suggestionNode.remove();
        suggestionNode = undefined;
    }

    function getTheWordToCheck(theText, theSub){
        let re = new RegExp(`${theSub}$`, "gi")
        let minus = theText.replace(re, "");

        return minus.split(' ').pop();			
    }

    function keyCheck( keyCode ){
        return excludedKeys.indexOf(keyCode) == -1
    }

    function getCompletion(typed, word) {
        let re = new RegExp(`^${typed}`, "gi")
        
        return word.replace(re, "");
    }

    function insertCompletionNode(ed, txt){
        removeSuggestionNode();

        let rng = ed.selection.getRng(1);
        
        suggestionNode = ed.getDoc().createElement("span");
        suggestionNode.style.color = suggestionTextColor;
        suggestionNode.innerHTML = txt;
        suggestionNode.id = suggestionNodeId;
        let offset =  ed.selection.getSel().focusOffset;
        rng.insertNode(suggestionNode);

        let nodeSuggestion = ed.dom.select(`#${suggestionNodeId}`);

        if(nodeSuggestion[0].lastChild != null){
            ed.selection.setCursorLocation(nodeSuggestion[0].firstChild, 0);					
        }

        ed.selection.collapse(0);

        waiting = true;
        waitingText = txt;
    }

    function resetSuggestion() {
        waiting = false;
        waitingText = undefined;
    }

    function completeWord(ed) {
        removeSuggestionNode();
        ed.execCommand('mceInsertContent', false, waitingText);
        ed.selection.collapse(1);
        
        resetSuggestion();
    }

    function changeSuggestionDom(ed, key){
        if(waitingText && waitingText.toLocaleLowerCase().startsWith(key.toLocaleLowerCase())){
            waitingText = waitingText.substring(1);
            removeSuggestionNode()
            insertCompletionNode(ed, waitingText)
        }else{
            removeSuggestionNode()
            resetSuggestion();
        }
    }

    async function startProcess(ed){
        let offset =  ed.selection.getSel().focusOffset;
        let rng = ed.selection.getRng(1);
        let theText = rng.startContainer.data;

        if(theText){
            let theSub = theText.substring(offset);

            if(theSub.length == 0 || theSub.match(/^\s/g)){
                const wordToCheck = getTheWordToCheck(theText, theSub);
                if(wordToCheck.length >= minLengthSearch){
                    let wordFound = await findWord(wordToCheck);
                    if(wordFound != undefined){
                        let substr = getCompletion(wordToCheck, wordFound)
                        insertCompletionNode(ed, substr);
                    }							
                }
            }else{
                //console.log(theSub.charAt(0));
            }
        }else{
            //TODO
        }				
    }

    let process = debounce(async function(event, editor) {
        if(keyCheck(event.code)){
            startProcess(editor)
        }

        var name = event.key;
        var char = event.code;
    });

    editor.on('keyup', (event) => {
        if(!waiting){
            process(event, editor)
        }else{
            /*if(keyCheck(event.code)){
                //console.log('TODO', event.key);
                
            }else{
                removeSuggestionNode();
                resetSuggestion();
            }*/							
        }						
    });

    editor.on('keydown', (event) => { //console.log(event.code);
        if(event.code == 'Tab' && waiting){
            cancelEvent(event)
            completeWord(editor)
        }else{
            if(!keyCheck(event.code)){
                removeSuggestionNode();
                resetSuggestion();
            }else if(waiting && neutralKeys.indexOf(event.code) == -1){
                changeSuggestionDom(editor, event.key)
            }
        }
    });

    editor.on('blur', (e) => {
        removeSuggestionNode();
        resetSuggestion();
    })	
    
    editor.on('click', (e) => {
        removeSuggestionNode();
        resetSuggestion();
    })
});