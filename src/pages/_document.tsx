import Document, {DocumentContext, Head, Html, Main, NextScript} from "next/document";
import React from "react";

export default class CustomDocument extends Document {
  static async getInitialProps(context: DocumentContext) {
    const initialProps = await Document.getInitialProps(context)

    return {...initialProps}
  }

  render(): React.ReactElement {
    return (
      <Html lang="en">
        <Head>
          <link rel="stylesheet"
                type="text/css"
                href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,700,900" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
