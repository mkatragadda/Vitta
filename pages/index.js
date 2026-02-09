import Head from 'next/head'
import VittaApp from '../components/VittaApp'

export default function Home() {
  return (
    <>
      <Head>
        <title>Vitta - Agentic Wallet for Global Families</title>
        <meta name="description" content="Autonomous execution platform. Snipes peak FX rates, automates bill payments, routes via optimal rails." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VittaApp />
    </>
  )
}