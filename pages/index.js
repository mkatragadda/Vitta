import Head from 'next/head'
import VittaApp from '../components/VittaApp'

export default function Home() {
  return (
    <>
      <Head>
        <title>Vitta - UPI payments for NRIs and India travelers</title>
        <meta
          name="description"
          content="Built for US-based NRIs and India travelers. Scan UPI QR codes, save recipients, and pay in INR through supported transfer partners."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <VittaApp />
    </>
  );
}