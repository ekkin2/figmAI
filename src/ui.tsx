import {
  Button,
  Columns,
  Container,
  Muted,
  render,
  Text,
  Textbox,
  TextboxNumeric,
  VerticalSpace
} from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useState } from 'preact/hooks'

import { htmlToFigma } from '@builder.io/html-to-figma';
import { CloseHandler, CreateRectanglesHandler, GPTHandler } from './types'

function Plugin() {
  const [count, setCount] = useState<number | null>(5)
  const [countString, setCountString] = useState('5')
  const [textInput, setTextInput] = useState<string>("");
  function handleInput(event: any) {
    const newValue = event.currentTarget.value
    // console.log(newValue)
    setTextInput(newValue)
  }

  const handleCreateRectanglesButtonClick = useCallback(
    function () {
      if (count !== null) {
        emit<CreateRectanglesHandler>('CREATE_RECTANGLES', count)
      }
    },
    [count]
  )
  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>('CLOSE')
  }, [])

  const handleGPTButtonClick = useCallback(function () {

    // use some browser code
    console.log("user text input: ", textInput);
    fetch(`http://localhost:3000/?` + new URLSearchParams({
      query: textInput, 
    }))
      .then((response) => {
        console.log(response.text);
        return response.text();
      }).then((data) => {
        console.log("text from gpt:", data);
        
        const testHtml = `
      <html><body><h1>Welcome to My Webpage</h1><p>This is a basic webpage with some nice styling.</p></body></html>`; 

      const otherTestHtml = `<HTML>

      <HEAD>
      
      <TITLE>Your Title Here</TITLE>
      
      </HEAD>
      
      <BODY BGCOLOR="FFFFFF">
      
      <CENTER><IMG SRC="clouds.jpg" ALIGN="BOTTOM"> </CENTER>
      
      <HR>
      
      <a href="http://somegreatsite.com">Link Name</a>
      
      is a link to another nifty site
      
      <H1>This is a Header</H1>
      
      <H2>This is a Medium Header</H2>
      
      Send me mail at <a href="mailto:support@yourcompany.com">
      
      support@yourcompany.com</a>.
      
      <P> This is a new paragraph!
      
      <P> <B>This is a new paragraph!</B>
      
      <BR> <B><I>This is a new sentence without a paragraph break, in bold italics.</I></B>
      
      <HR>
      
      </BODY>
      
      </HTML>    
      `
      // var el = document.createElement( 'html' );
      // el.innerHTML = otherTestHtml; 
      // console.log(el);

      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(data, 'text/html');
      const layers = htmlToFigma(htmlDoc.body);
      console.log("Layers: ", layers); 
      var json = JSON.stringify(layers);
      console.log("json: ", json);
      // fs.writeFile('myjsonfile.figma.json', json, 'utf8',function(err) {
      //   if (err) throw err;
      //   console.log('complete');
      //   });
      // go from layers
      // call GPT
      emit('GPT', layers); 
    }); 
        
    
    
  }, [textInput])

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <Muted>Enter your design</Muted>
      </Text>
      <VerticalSpace space="small" />
      <Textbox
        // style={{
        //   height: 24,  
        // }}
        onInput={handleInput}
        value={textInput}
        variant="border"
      />

      <VerticalSpace space="extraLarge" />
      <Columns space="extraSmall">
        <Button fullWidth onClick={handleGPTButtonClick}>
          Create
        </Button>
        <Button fullWidth onClick={handleCloseButtonClick} secondary>
          Close
        </Button>
      </Columns>
      <VerticalSpace space="small" />
    </Container>
  )
}

export default render(Plugin)
