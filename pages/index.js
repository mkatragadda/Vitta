import Head from 'next/head'
import VittaApp from '../components/VittaApp'

export default function Home() {
  return (
    <>
      <Head>
        <title>Vitta - Travel wallet for NRIs &amp; India Tourists</title>
        <meta name="description" content="Built for US NRIs and India travelers. Scan UPI QR codes and pay in INR from your USD wallet—like a local, powered by Wise." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VittaApp />
    </>
  )
}