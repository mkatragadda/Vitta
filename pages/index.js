import Head from 'next/head'
import VittaDocumentChat from '../components/VittaDocumentChat'

export default function Home() {
  return (
    <>
      <Head>
        <title>Vitta - AI Document Chat</title>
        <meta name="description" content="Chat with your financial documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VittaDocumentChat />
    </>
  )
}