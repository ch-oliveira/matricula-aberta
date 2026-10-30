import { useMemo, type ReactNode } from 'react';
import { Icone } from '../components/Icone';
import { Sheet } from '../components/Sheet';
import { StatusPill } from '../components/ui';
import { buscar } from '../domain/busca';
import { STATUS_INFO } from '../domain/etapas';
import { formatarDistancia, minutosAPe, tempoRelativo } from '../domain/geo';
import type { Busca } from '../domain/types';
import { useEscolas } from '../services/vagasStore';

interface Props {
  open: boolean;
  onClose: () => void;
  busca: Busca;
  ids: string[];
  onEscolher: (id: string) => void;
}

export function CompareSheet({ open, onClose, busca, ids, onEscolher }: Props) {
  const escolas = useEscolas();
  const itens = useMemo(
    () => buscar(escolas, { ...busca, raioKm: 999, soAcessivel: false }).filter((r) => ids.includes(r.escola.id)),
    [escolas, busca, ids],
  );
  const maisPerto = Math.min(...itens.map((i) => i.distanciaKm));
  const maisVagas = Math.max(...itens.map((i) => i.oferta.vagas));
  const agora = Date.now();

  const linhas: { rotulo: string; celula: (i: (typeof itens)[number]) => ReactNode }[] = [
    { rotulo: 'Situação', celula: (i) => <StatusPill status={i.status} /> },
    {
      rotulo: 'Vagas',
      celula: (i) => (
        <>
          {STATUS_INFO[i.status].frase(i.oferta.vagas, i.oferta.fila)}
          {i.oferta.vagas === maisVagas && maisVagas > 0 && (
            <span className="trofeu" title="Mais vagas">
              {' '}
              <Icone nome="award" tamanho={16} />
            </span>
          )}
        </>
      ),
    },
    {
      rotulo: 'Distância',
      celula: (i) => (
        <>
          {formatarDistancia(i.distanciaKm)} · <Icone nome="walk" tamanho={14} /> {minutosAPe(i.distanciaKm)}min
          {i.distanciaKm === maisPerto && (
            <span className="trofeu" title="Mais perto">
              {' '}
              <Icone nome="award" tamanho={16} />
            </span>
          )}
        </>
      ),
    },
    {
      rotulo: 'Período',
      celula: (i) => (
        <>
          <Icone nome={i.oferta.periodo === 'integral' ? 'sun' : 'cloud-sun'} tamanho={15} />{' '}
          {i.oferta.periodo === 'integral' ? 'Integral' : 'Meio período'}
        </>
      ),
    },
    {
      rotulo: 'Acessível',
      celula: (i) =>
        i.escola.acessivel ? (
          <>
            <Icone nome="accessibility" tamanho={15} /> Sim
          </>
        ) : (
          '— Não'
        ),
    },
    { rotulo: 'Destaques', celula: (i) => i.escola.destaques.join(', ') },
    { rotulo: 'Atendimento', celula: (i) => i.escola.atendimento },
    { rotulo: 'Atualizado', celula: (i) => tempoRelativo(i.escola.atualizadoEm, agora) },
  ];

  return (
    <Sheet
      open={open && itens.length > 0}
      onClose={onClose}
      titulo={
        <>
          <Icone nome="scale" tamanho={18} /> Comparando escolas
        </>
      }
    >
      <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Tabela de comparação">
        <table className="comparador">
          <thead>
            <tr>
              <td />
              {itens.map((i) => (
                <th key={i.escola.id} scope="col">{i.escola.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.rotulo}>
                <th scope="row">{l.rotulo}</th>
                {itens.map((i) => (
                  <td key={i.escola.id}>{l.celula(i)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {itens.map((i) => (
                <td key={i.escola.id}>
                  <button type="button" className="btn btn-primario btn-pequeno" onClick={() => onEscolher(i.escola.id)}>
                    Escolher
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="legenda">
        <Icone nome="award" tamanho={15} /> = melhor opção naquele quesito
      </p>
    </Sheet>
  );
}
