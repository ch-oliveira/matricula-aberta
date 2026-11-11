import { useEffect } from 'react';
import { Icone } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import type { CertidaoCumprimentoJudicialDTO } from '../../domain/types';

interface Props {
  certidao: CertidaoCumprimentoJudicialDTO;
  aoFechar: () => void;
}

export function ModalCertidaoJudicial({ certidao, aoFechar }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        aoFechar();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aoFechar]);

  function copiarHash() {
    navigator.clipboard.writeText(certidao.hashAutenticidade);
    toast('Hash SHA-256 copiado para a área de transferência!', { emoji: 'check-circle', tom: 'ok' });
  }

  function imprimir() {
    window.print();
  }

  return (
    <div className="sheet-backdrop" onClick={aoFechar} role="presentation">
      <div
        className="sheet-conteudo modal-certidao-judicial-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="t-certidao-judicial"
        aria-modal="true"
      >
        <div className="modal-topo-simples">
          <div>
            <span className="lp-tag">Certidão Oficial · PJ-e TJ-PB</span>
            <h2 id="t-certidao-judicial">
              Certidão de Cumprimento de Ordem Judicial
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-fantasma btn-pequeno"
            onClick={aoFechar}
            aria-label="Fechar"
          >
            <Icone nome="x" tamanho={20} />
          </button>
        </div>

        {/* Corpo Oficial da Certidão */}
        <div id="area-impressao-certidao" className="certidao-oficial-papel">
          <div className="certidao-timbre-oficial">
            <div className="timbre-ente">
              ESTADO DA PARAÍBA · MUNICÍPIO DE PATOS
            </div>
            <div className="timbre-orgao">SECRETARIA MUNICIPAL DE EDUCAÇÃO (SEDUC)</div>
            <div className="timbre-setor">Central de Regulação de Vagas e Atendimento ao Judiciário</div>
          </div>

          <div className="certidao-titulo-central">
            CERTIDÃO ELETRÔNICA DE CUMPRIMENTO TEMPESTIVO DE ORDEM JUDICIAL
          </div>

          <p className="certidao-paragrafo">
            CERTIFICO, para os devidos fins de direito e instrução processual perante a <strong>{certidao.vara}</strong>, que nos autos da ação nº <strong>{certidao.numeroProcesso}</strong>, o Município de Patos / SEDUC deu <strong>integral e tempestivo cumprimento</strong> à determinação judicial de garantia de vaga escolar em favor do(a) infante:
          </p>

          <div className="certidao-ficha-dados">
            <div><strong>Beneficiário(a):</strong> {certidao.estudanteNome}</div>
            <div><strong>Responsável Legal:</strong> {certidao.responsavelNome} (CPF: {certidao.cpfCertidaoMascarado})</div>
            <div><strong>Unidade Alocada:</strong> {certidao.escolaNome}</div>
            <div><strong>Endereço:</strong> {certidao.escolaEndereco}</div>
            <div><strong>Etapa / Turma:</strong> {certidao.etapaNome} · Turma {certidao.turma} ({certidao.periodo})</div>
            <div><strong>Protocolo Eletrônico de Reserva:</strong> <strong className="texto-destaque-protocolo">{certidao.protocoloCodigo}</strong></div>
            <div><strong>Data e Turno da Visita:</strong> {certidao.dataVisita} ({certidao.turnoVisita})</div>
            <div><strong>Emissão da Certidão:</strong> {new Date(certidao.emitidoEm).toLocaleString('pt-BR')}</div>
          </div>

          <p className="certidao-paragrafo">
            A vaga encontra-se formalmente reservada com prioridade legal absoluta no sistema integrado de matrículas do Município de Patos - PB, cessando quaisquer cominações pecuniárias ou astreintes fixadas.
          </p>

          {/* Autenticação Criptográfica SHA-256 */}
          <div className="certidao-bloco-sha">
            <div className="sha-titulo">
              CHAVE DE VALIDAÇÃO CRIPTOGRÁFICA (SHA-256):
            </div>
            <div className="sha-hash">{certidao.hashAutenticidade}</div>
            <div className="sha-amparo">
              Documento emitido nos termos da Lei Federal nº 14.063/2020 e Lei 11.419/2006 para juntada aos autos do PJ-e.
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="certidao-botoes-acoes">
          <button type="button" className="btn btn-secundario" onClick={copiarHash}>
            <Icone nome="clipboard-check" tamanho={16} /> Copiar Hash SHA-256
          </button>
          <div className="certidao-acoes-impressao">
            <button type="button" className="btn btn-primario" onClick={imprimir}>
              <Icone nome="file-text" tamanho={16} /> Imprimir / Salvar PDF
            </button>
            <button type="button" className="btn btn-fantasma" onClick={aoFechar}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

