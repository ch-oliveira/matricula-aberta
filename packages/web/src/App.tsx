import { PwaInstallBanner } from './components/PwaInstallBanner';
import { Toasts } from './components/Toasts';
import { useHashRoute } from './hooks';
import { CidadaoApp } from './screens/CidadaoApp';
import { Gestao } from './screens/Gestao';

export default function App() {
  const rota = useHashRoute();
  return (
    <>
      {rota.startsWith('#/gestao') ? <Gestao /> : <CidadaoApp />}
      <PwaInstallBanner />
      <Toasts />
    </>
  );
}

