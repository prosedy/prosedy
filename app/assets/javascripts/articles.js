// Util.js

String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, ''); };

function supportsHtmlStorage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function get_text(el) {
    ret = " ";
    var length = el.childNodes.length;
    for(var i = 0; i < length; i++) {
        var node = el.childNodes[i];
        if(node.nodeType != 8) {

          if ( node.nodeType != 1 ) {
            // Strip white space.
            ret += node.nodeValue;
          } else {
            ret += get_text( node );
          }
        }
    }
    return ret.trim();
}

// Editor.js

var editor = (function() {

  // Editor elements
  var headerField, contentField, cleanSlate, lastType, currentNodeList, savedSelection;

  // Editor Bubble elements
  var textOptions, optionsBox, boldButton, italicButton, quoteButton, urlButton, urlInput;


  function init() {

    lastRange = 0;
    composing = false;
    bindElements();

    // Set cursor position
    var range = document.createRange();
    var selection = window.getSelection();
    range.setStart(headerField, 1);
    selection.removeAllRanges();
    selection.addRange(range);

    createEventBindings();

    // Load state if storage is supported
    if ( supportsHtmlStorage() ) {
      loadState();
    }
  }

  function createEventBindings( on ) {

    // Key up bindings
    if ( supportsHtmlStorage() ) {

      document.onkeyup = function( event ) {
        checkTextHighlighting( event );
        saveState();
      }

    } else {
      document.onkeyup = checkTextHighlighting;
    }

    // Mouse bindings
    document.onmousedown = checkTextHighlighting;
    document.onmouseup = function( event ) {

      setTimeout( function() {
        checkTextHighlighting( event );
      }, 1);
    };
    
    // Window bindings
    window.addEventListener( 'resize', function( event ) {
      updateBubblePosition();
    });

    // Scroll bindings. We limit the events, to free the ui
    // thread and prevent stuttering. See:
    // http://ejohn.org/blog/learning-from-twitter
    var scrollEnabled = true;
    document.body.addEventListener( 'scroll', function() {
      
      if ( !scrollEnabled ) {
        return;
      }
      
      scrollEnabled = true;
      
      updateBubblePosition();
      
      return setTimeout((function() {
        scrollEnabled = true;
      }), 250);
    });

    // Composition bindings. We need them to distinguish
    // IME composition from text selection
    document.addEventListener( 'compositionstart', onCompositionStart );
    document.addEventListener( 'compositionend', onCompositionEnd );
  }

  function bindElements() {

    headerField = document.querySelector( '.header' );
    contentField = document.querySelector( '.content' );
    textOptions = document.querySelector( '.text-options' );

    optionsBox = textOptions.querySelector( '.options' );

    boldButton = textOptions.querySelector( '.bold' );
    boldButton.onclick = onBoldClick;

    italicButton = textOptions.querySelector( '.italic' );
    italicButton.onclick = onItalicClick;

    quoteButton = textOptions.querySelector( '.quote' );
    quoteButton.onclick = onQuoteClick;

    urlButton = textOptions.querySelector( '.url' );
    urlButton.onmousedown = onUrlClick;

    urlInput = textOptions.querySelector( '.url-input' );
    urlInput.onblur = onUrlInputBlur;
    urlInput.onkeydown = onUrlInputKeyDown;
  }

  function checkTextHighlighting( event ) {

    var selection = window.getSelection();

    if ( (event.target.className === "url-input" ||
         event.target.classList.contains( "url" ) ||
         event.target.parentNode.classList.contains( "ui-inputs")) ) {

      currentNodeList = findNodes( selection.focusNode );
      updateBubbleStates();
      return;
    }

    // Check selections exist
    if ( selection.isCollapsed === true && lastType === false ) {

      onSelectorBlur();
    }

    // Text is selected
    if ( selection.isCollapsed === false && composing === false ) {

      currentNodeList = findNodes( selection.focusNode );

      // Find if highlighting is in the editable area
      if ( hasNode( currentNodeList, "ARTICLE") ) {
        updateBubbleStates();
        updateBubblePosition();

        // Show the ui bubble
        textOptions.className = "text-options active";
      }
    }

    lastType = selection.isCollapsed;
  }
  
  function updateBubblePosition() {
    var selection = window.getSelection();
    var range = selection.getRangeAt(0);
    var boundary = range.getBoundingClientRect();
    
    textOptions.style.top = boundary.top - 5 + window.pageYOffset + "px";
    textOptions.style.left = (boundary.left + boundary.right)/2 + "px";
  }

  function updateBubbleStates() {

    // It would be possible to use classList here, but I feel that the
    // browser support isn't quite there, and this functionality doesn't
    // warrent a shim.

    if ( hasNode( currentNodeList, 'B') ) {
      boldButton.className = "bold active"
    } else {
      boldButton.className = "bold"
    }

    if ( hasNode( currentNodeList, 'I') ) {
      italicButton.className = "italic active"
    } else {
      italicButton.className = "italic"
    }

    if ( hasNode( currentNodeList, 'BLOCKQUOTE') ) {
      quoteButton.className = "quote active"
    } else {
      quoteButton.className = "quote"
    }

    if ( hasNode( currentNodeList, 'A') ) {
      urlButton.className = "url useicons active"
    } else {
      urlButton.className = "url useicons"
    }
  }

  function onSelectorBlur() {

    textOptions.className = "text-options fade";
    setTimeout( function() {

      if (textOptions.className == "text-options fade") {

        textOptions.className = "text-options";
        textOptions.style.top = '-999px';
        textOptions.style.left = '-999px';
      }
    }, 260 )
  }

  function findNodes( element ) {

    var nodeNames = {};

    while ( element.parentNode ) {

      nodeNames[element.nodeName] = true;
      element = element.parentNode;

      if ( element.nodeName === 'A' ) {
        nodeNames.url = element.href;
      }
    }

    return nodeNames;
  }

  function hasNode( nodeList, name ) {

    return !!nodeList[ name ];
  }

  function saveState( event ) {
    
    localStorage[ 'header' ] = headerField.innerHTML;
    localStorage[ 'content' ] = contentField.innerHTML;
  }

  function loadState() {

    if ( localStorage[ 'header' ] ) {
      headerField.innerHTML = localStorage[ 'header' ];
    }

    if ( localStorage[ 'content' ] ) {
      contentField.innerHTML = localStorage[ 'content' ];
    }
  }

  function onBoldClick() {
    document.execCommand( 'bold', false );
  }

  function onItalicClick() {
    document.execCommand( 'italic', false );
  }

  function onQuoteClick() {

    var nodeNames = findNodes( window.getSelection().focusNode );

    if ( hasNode( nodeNames, 'BLOCKQUOTE' ) ) {
      document.execCommand( 'formatBlock', false, 'p' );
      document.execCommand( 'outdent' );
    } else {
      document.execCommand( 'formatBlock', false, 'blockquote' );
    }
  }

  function onUrlClick() {

    if ( optionsBox.className == 'options' ) {

      optionsBox.className = 'options url-mode';

      // Set timeout here to debounce the focus action
      setTimeout( function() {

        var nodeNames = findNodes( window.getSelection().focusNode );

        if ( hasNode( nodeNames , "A" ) ) {
          urlInput.value = nodeNames.url;
        } else {
          // Symbolize text turning into a link, which is temporary, and will never be seen.
          document.execCommand( 'createLink', false, '/' );
        }

        // Since typing in the input box kills the highlighted text we need
        // to save this selection, to add the url link if it is provided.
        lastSelection = window.getSelection().getRangeAt(0);
        lastType = false;

        urlInput.focus();

      }, 100);

    } else {

      optionsBox.className = 'options';
    }
  }

  function onUrlInputKeyDown( event ) {

    if ( event.keyCode === 13 ) {
      event.preventDefault();
      applyURL( urlInput.value );
      urlInput.blur();
    }
  }

  function onUrlInputBlur( event ) {

    optionsBox.className = 'options';
    applyURL( urlInput.value );
    urlInput.value = '';

    currentNodeList = findNodes( window.getSelection().focusNode );
    updateBubbleStates();
  }

  function applyURL( url ) {

    rehighlightLastSelection();

    // Unlink any current links
    document.execCommand( 'unlink', false );

    if (url !== "") {
    
      // Insert HTTP if it doesn't exist.
      if ( !url.match("^(http|https)://") ) {

        url = "http://" + url;  
      } 

      document.execCommand( 'createLink', false, url );
    }
  }

  function rehighlightLastSelection() {

    window.getSelection().addRange( lastSelection );
  }

  function getWordCount() {
    
    var text = get_text( contentField );

    if ( text === "" ) {
      return 0
    } else {
      return text.split(/\s+/).length;
    }
  }

  function onCompositionStart ( event ) {
    composing = true;
  }

  function onCompositionEnd (event) {
    composing = false;
  }

  return {
    init: init,
    saveState: saveState,
    getWordCount: getWordCount
  }

})();

// Ui.js

var ui = (function() {

  // Base elements
  var body, article, uiContainer, overlay, aboutButton, descriptionModal;

  // Buttons
  var screenSizeElement, colorLayoutElement, targetElement, saveElement;

  // Work Counter
  var wordCountValue, wordCountBox, wordCountElement, wordCounter, wordCounterProgress;
  
  //save support
  var supportSave, saveFormat, textToWrite;
  
  var expandScreenIcon = '&#xe000;';
  var shrinkScreenIcon = '&#xe004;';

  var darkLayout = false;

  function init() {
    
    supportsSave = !!new Blob()?true:false;
    
    bindElements();

    wordCountActive = false;

    if ( supportsHtmlStorage() ) {
      loadState();
    }
    
    console.log( "Checkin under the hood eh? We've probably got a lot in common. You should totally check out ZenPen on github! (https://github.com/tholman/zenpen)." );
  }

  function loadState() {

    // Activate word counter
    if ( localStorage['wordCount'] && localStorage['wordCount'] !== "0") {      
      wordCountValue = parseInt(localStorage['wordCount']);
      wordCountElement.value = localStorage['wordCount'];
      wordCounter.className = "word-counter active";
      updateWordCount();
    }

    // Activate color switch
    if ( localStorage['darkLayout'] === 'true' ) {
      if ( darkLayout === false ) {
        document.body.className = 'yang';
      } else {
        document.body.className = 'yin';
      }
      darkLayout = !darkLayout;
    }

  }

  function saveState() {

    if ( supportsHtmlStorage() ) {
      localStorage[ 'darkLayout' ] = darkLayout;
      localStorage[ 'wordCount' ] = wordCountElement.value;
    }
  }

  function bindElements() {

    // Body element for light/dark styles
    body = document.body;

    uiContainer = document.querySelector( '.ui' );

    // UI element for color flip
    colorLayoutElement = document.querySelector( '.color-flip' );
    colorLayoutElement.onclick = onColorLayoutClick;

    // UI element for full screen
    screenSizeElement = document.querySelector( '.fullscreen' );
    screenSizeElement.onclick = onScreenSizeClick;

    targetElement = document.querySelector( '.target ');
    targetElement.onclick = onTargetClick;

    document.addEventListener( "fullscreenchange", function () {
      if ( document.fullscreenEnabled === false ) {
        exitFullscreen();
      }
    }, false);
    
    //init event listeners only if browser can save
    if (supportsSave) {

      saveElement = document.querySelector( '.save' );
      saveElement.onclick = onSaveClick;
      
      var formatSelectors = document.querySelectorAll( '.saveselection span' );
      for( var i in formatSelectors ) {
        formatSelectors[i].onclick = selectFormat;
      }
      
      document.querySelector('.savebutton').onclick = saveText;
    } else {
      document.querySelector('.save.useicons').style.display = "none";
    }

    // Overlay when modals are active
    overlay = document.querySelector( '.overlay' );
    overlay.onclick = onOverlayClick;

    article = document.querySelector( '.content' );
    article.onkeyup = onArticleKeyUp;

    wordCountBox = overlay.querySelector( '.wordcount' );
    wordCountElement = wordCountBox.querySelector( 'input' );
    wordCountElement.onchange = onWordCountChange;
    wordCountElement.onkeyup = onWordCountKeyUp;

    descriptionModal = overlay.querySelector( '.description' );
    
    saveModal = overlay.querySelector('.saveoverlay');

    wordCounter = document.querySelector( '.word-counter' );
    wordCounterProgress = wordCounter.querySelector( '.progress' );

    aboutButton = document.querySelector( '.about' );
    aboutButton.onclick = onAboutButtonClick;

    header = document.querySelector( '.header' );
    header.onkeypress = onHeaderKeyPress;
  }

  function onScreenSizeClick( event ) {

    if ( !document.fullscreenElement ) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  }

  function enterFullscreen() {
    document.body.requestFullscreen( Element.ALLOW_KEYBOARD_INPUT );
    screenSizeElement.innerHTML = shrinkScreenIcon; 
  }

  function exitFullscreen() {
    document.exitFullscreen();
    screenSizeElement.innerHTML = expandScreenIcon; 
  }

  function onColorLayoutClick( event ) {
    if ( darkLayout === false ) {
      document.body.className = 'yang';
    } else {
      document.body.className = 'yin';
    }
    darkLayout = !darkLayout;

    saveState();
  }

  function onTargetClick( event ) {
    overlay.style.display = "block";
    wordCountBox.style.display = "block";
    wordCountElement.focus();
  }

  function onAboutButtonClick( event ) {
    overlay.style.display = "block";
    descriptionModal.style.display = "block";
  }
  
  function onSaveClick( event ) {
    overlay.style.display = "block";
    saveModal.style.display = "block";
  }
  function saveText( event ) {

    if (typeof saveFormat != 'undefined' && saveFormat != '') {
      var blob = new Blob([textToWrite], {type: "text/plain;charset=utf-8"});
      saveAs(blob, 'ZenPen.txt');
    } else {
      document.querySelector('.saveoverlay h1').style.color = '#FC1E1E';
    }
  }
  /* Allows the user to press enter to tab from the title */
  function onHeaderKeyPress( event ) {

    if ( event.keyCode === 13 ) {
      event.preventDefault();
      article.focus();
    }
  }

  /* Allows the user to press enter to tab from the word count modal */
  function onWordCountKeyUp( event ) {
    
    if ( event.keyCode === 13 ) {
      event.preventDefault();
      
      setWordCount( parseInt(this.value) );

      removeOverlay();

      article.focus();
    }
  }

  function onWordCountChange( event ) {

    setWordCount( parseInt(this.value) );
  }

  function setWordCount( count ) {

    // Set wordcount ui to active
    if ( count > 0) {

      wordCountValue = count;
      wordCounter.className = "word-counter active";
      updateWordCount();

    } else {

      wordCountValue = 0;
      wordCounter.className = "word-counter";
    }
    
    saveState();
  }

  function onArticleKeyUp( event ) {

    if ( wordCountValue > 0 ) {
      updateWordCount();
    }
  }

  function updateWordCount() {

    var wordCount = editor.getWordCount();
    var percentageComplete = wordCount / wordCountValue;
    wordCounterProgress.style.height = percentageComplete * 100 + '%';

    if ( percentageComplete >= 1 ) {
      wordCounterProgress.className = "progress complete";
    } else {
      wordCounterProgress.className = "progress";
    }
  }

  function selectFormat( e ) {
    
    if ( document.querySelectorAll('span.activesave').length > 0 ) {
      document.querySelector('span.activesave').className = '';
    }
    
    document.querySelector('.saveoverlay h1').style.cssText = '';
    
    var targ;
    if (!e) var e = window.event;
    if (e.target) targ = e.target;
    else if (e.srcElement) targ = e.srcElement;
    
    // defeat Safari bug
    if (targ.nodeType == 3) {
      targ = targ.parentNode;
    }
      
    targ.className ='activesave';
    
    saveFormat = targ.getAttribute('data-format');
    
    var header = document.querySelector('header.header');
    var headerText = header.innerHTML.replace(/(\r\n|\n|\r)/gm,"") + "\n";
    
    var body = document.querySelector('article.content');
    var bodyText = body.innerHTML;
      
    textToWrite = formatText(saveFormat,headerText,bodyText);
    
    var textArea = document.querySelector('.hiddentextbox');
    textArea.value = textToWrite;
    textArea.focus();
    textArea.select();

  }

  function formatText( type, header, body ) {
    
    var text;
    switch( type ) {

      case 'html':
        header = "<h1>" + header + "</h1>";
        text = header + body;
        text = text.replace(/\t/g, '');
      break;

      case 'markdown':
        header = header.replace(/\t/g, '');
        header = header.replace(/\n$/, '');
        header = "#" + header + "#";
      
        text = body.replace(/\t/g, '');
      
        text = text.replace(/<b>|<\/b>/g,"**")
          .replace(/\r\n+|\r+|\n+|\t+/ig,"")
          .replace(/<i>|<\/i>/g,"_")
          .replace(/<blockquote>/g,"> ")
          .replace(/<\/blockquote>/g,"")
          .replace(/<p>|<\/p>/gi,"\n")
          .replace(/<br>/g,"\n");
        
        var links = text.match(/<a href="(.+)">(.+)<\/a>/gi);
        
                                if (links !== null) {
                                        for ( var i = 0; i<links.length; i++ ) {
                                                var tmpparent = document.createElement('div');
                                                tmpparent.innerHTML = links[i];
                                                
                                                var tmp = tmpparent.firstChild;
                                                
                                                var href = tmp.getAttribute('href');
                                                var linktext = tmp.textContent || tmp.innerText || "";
                                                
                                                text = text.replace(links[i],'['+linktext+']('+href+')');
                                        }
                                }
        
        text = header +"\n\n"+ text;
      break;

      case 'plain':
        header = header.replace(/\t/g, '');
      
        var tmp = document.createElement('div');
        tmp.innerHTML = body;
        text = tmp.textContent || tmp.innerText || "";
        
        text = text.replace(/\t/g, '')
          .replace(/\n{3}/g,"\n")
          .replace(/\n/,""); //replace the opening line break
        
        text = header + text;
      break;
      default:
      break;
    }
    
    return text;
  }

  function onOverlayClick( event ) {

    if ( event.target.className === "overlay" ) {
      removeOverlay();
    }
  }

  function removeOverlay() {
    
    overlay.style.display = "none";
    wordCountBox.style.display = "none";
    descriptionModal.style.display = "none";
    saveModal.style.display = "none";
    
    if ( document.querySelectorAll('span.activesave' ).length > 0) {
      document.querySelector('span.activesave').className = '';
    }

    saveFormat='';
  }

  return {
    init: init
  }

})();