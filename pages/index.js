import Head from 'next/head'
import VittaApp from '../components/VittaApp'

export default function Home() {
  return (
    <>
      <Head>
        <title>Vitta - Family finance assistant with AI</title>
        <meta name="description" content="Chat with your financial documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VittaApp />
    </>
  )
}