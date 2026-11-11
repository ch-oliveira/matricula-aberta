import { useEffect } from 'react';
import { Icone } from '../../components/Icone';
import { ETAPAS } from '../../domain/etapas';
import { mascararProcessoCNJ, type DemandaJudicial } from '../../domain/types';

interface Props {
  demanda: DemandaJudicial;
  aoFechar: () => void;
  aoConfirmar: () => void;
  carregando: boolean;
}

export function ModalConfirmacaoAlocacaoJudicial({
  demanda,
  aoFechar,
  aoConfirmar,
  carregando,
}: Props) {
  // Acessibilidade: fecha no Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !carregando) {
        aoFechar();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aoFechar, carregando]);

  return (
    <div className="sheet-backdrop" onClick={aoFechar} role="presentation">
      <div
        className="sheet-conteudo modal-confirmacao-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="t-modal-confirm-judicial"
        aria-modal="true"
      >
        <div className="modal-topo-simples">
          <div>
            <span className="lp-tag lp-tag-judicial">
              Tutela de Urgência · PJ-e
            </span>
            <h2 id="t-modal-confirm-judicial">
              Confirmar Alocação Prioritária Imediata
            </h2>
            <p className="legenda">
              Cumprimento tempestivo de determinação judicial vinculante (CF art. 227 / ECA art. 53).
            </p>
          </div>
          <button
            type="button"
            className="btn btn-fantasma btn-pequeno"
            onClick={aoFechar}
            disabled={carregando}
            aria-label="Fechar"
          >
            <Icone nome="x" tamanho={18} />
          </button>
        </div>

        <div className="confirmacao-dados-card">
          <div className="confirmacao-linha">
            <span className="confirmacao-rotulo">
              Processo Judicial (CNJ)
            </span>
            <span className="confirmacao-proc-numero">
              {mascararProcessoCNJ(demanda.numeroProcesso)}
            </span>
          </div>

          <div className="confirmacao-secao">
            <span className="confirmacao-rotulo">
              Estudante Beneficiário
            </span>
            <div className="confirmacao-destaque">
              {demanda.estudanteNome}
            </div>
            <div className="confirmacao-sub">
              Responsável: <strong>{demanda.responsavelNome}</strong> (CPF: {demanda.cpfCertidao})
            </div>
          </div>

          <div className="confirmacao-secao">
            <span className="confirmacao-rotulo">
              Unidade Escolar & Etapa Destinada
            </span>
            <div className="confirmacao-destaque-escola">
              {demanda.escolaNome}
            </div>
            <div className="confirmacao-sub">
              {ETAPAS[demanda.etapa]?.nome ?? demanda.etapa} · Período {demanda.periodo === 'integral' ? 'Integral' : 'Parcial'}
            </div>
          </div>

          <div className="confirmacao-rodape-vara">
            <span className="confirmacao-sub">
              Juízo / Vara: <strong>{demanda.vara}</strong>
            </span>
            {demanda.multaDiaria ? (
              <span className="confirmacao-multa">
                Astreinte: R$ {demanda.multaDiaria.toLocaleString('pt-BR')}/dia
              </span>
            ) : null}
          </div>
        </div>

        <div className="confirmacao-aviso-efeitos">
          <Icone nome="alert-triangle" tamanho={18} />
          <div>
            <strong>Efeitos imediatos da confirmação:</strong>
            <div className="aviso-efeitos-texto">
              Será alocada vaga imediata para o estudante, gerado protocolo com vaga pré-reservada, registrado o ato na Trilha de Auditoria do TCE-PB e lavrada a Certidão Oficial com validação SHA-256 para juntada ao PJ-e.
            </div>
          </div>
        </div>

        <div className="confirmacao-acoes">
          <button type="button" className="btn btn-secundario" onClick={aoFechar} disabled={carregando}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario btn-confirmar-alocacao"
            onClick={aoConfirmar}
            disabled={carregando}
          >
            {carregando ? (
              <>
                <Icone nome="hourglass" tamanho={16} /> Alocando vaga...
              </>
            ) : (
              <>
                <Icone nome="check-circle" tamanho={16} /> Confirmar Alocação Imediata
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

