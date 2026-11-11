import { useEffect, useState, type FormEvent } from 'react';
import { Icone } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import { ETAPAS } from '../../domain/etapas';
import { ORDEM_ETAPAS, type Escola, type EtapaId, type Periodo } from '../../domain/types';
import { vagasStore } from '../../services/vagasStore';

interface Props {
  escolas: Escola[];
  aoFechar: () => void;
  aoSucesso: () => void;
}

export function ModalCadastroDemandaJudicial({ escolas, aoFechar, aoSucesso }: Props) {
  const [numeroProcesso, setNumeroProcesso] = useState('0801234-56.2026.8.15.0251');
  const [vara, setVara] = useState('1ª Vara da Infância e da Juventude');
  const [juizPromotor, setJuizPromotor] = useState('Dra. Maria Clara / Juíza de Direito');
  const [estudanteNome, setEstudanteNome] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [cpfCertidao, setCpfCertidao] = useState('');
  const [escolaId, setEscolaId] = useState(escolas[0]?.id ?? '');
  const [etapa, setEtapa] = useState<EtapaId>('maternal');
  const [periodo, setPeriodo] = useState<Periodo>('integral');
  const [prazoHoras, setPrazoHoras] = useState(48);
  const [multaDiaria, setMultaDiaria] = useState('500');
  const [observacoes, setObservacoes] = useState(
    'Decisão liminar deferida para garantia imediata de vaga em unidade próxima à residência.',
  );
  const [salvando, setSalvando] = useState(false);

  // Fecha no Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !salvando) {
        aoFechar();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aoFechar, salvando]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!numeroProcesso.trim() || !estudanteNome.trim() || !responsavelNome.trim() || !cpfCertidao.trim()) {
      toast('Preencha os campos obrigatórios da determinação judicial.', { emoji: 'alert-triangle', tom: 'aviso' });
      return;
    }

    setSalvando(true);
    try {
      await vagasStore.cadastrarDemandaJudicial({
        numeroProcesso: numeroProcesso.trim(),
        vara: vara.trim(),
        juizPromotor: juizPromotor.trim() || undefined,
        estudanteNome: estudanteNome.trim(),
        responsavelNome: responsavelNome.trim(),
        cpfCertidao: cpfCertidao.trim(),
        escolaId,
        etapa,
        periodo,
        prazoHoras: Number(prazoHoras) || 48,
        multaDiaria: multaDiaria ? Number(multaDiaria) : undefined,
        observacoes: observacoes.trim() || undefined,
      });

      toast('Demanda judicial autuada com sucesso!', { emoji: 'check-circle', tom: 'ok' });
      aoSucesso();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao autuar processo judicial.', {
        emoji: 'alert-triangle',
        tom: 'aviso',
      });
      setSalvando(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={aoFechar} role="presentation">
      <div
        className="sheet-conteudo modal-autuacao-judicial-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="t-modal-judicial"
        aria-modal="true"
      >
        <div className="modal-topo-simples">
          <div>
            <span className="lp-tag">Poder Judiciário · PJ-e</span>
            <h2 id="t-modal-judicial">
              Autuar Determinação Judicial / Liminar
            </h2>
            <p className="legenda">
              Cadastre o mandado ou decisão judicial para controle do prazo fatal e garantia de prioridade legal absoluta.
            </p>
          </div>
          <button type="button" className="btn btn-fantasma btn-pequeno" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="x" tamanho={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-autuacao-judicial">
          <div className="form-grid-2-1">
            <div className="campo">
              <label>Número do Processo (CNJ) *</label>
              <input
                type="text"
                required
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
                placeholder="0000000-00.0000.8.15.0000"
              />
            </div>
            <div className="campo">
              <label>Juiz(a) / Promotor(a)</label>
              <input
                type="text"
                value={juizPromotor}
                onChange={(e) => setJuizPromotor(e.target.value)}
                placeholder="Nome do magistrado..."
              />
            </div>
          </div>

          <div className="campo">
            <label>Vara / Juízo *</label>
            <input
              type="text"
              required
              value={vara}
              onChange={(e) => setVara(e.target.value)}
            />
          </div>

          <div className="form-grid-2-1">
            <div className="campo">
              <label>Nome do Aluno (Criança / Beneficiário) *</label>
              <input
                type="text"
                required
                value={estudanteNome}
                onChange={(e) => setEstudanteNome(e.target.value)}
                placeholder="Nome do menor..."
              />
            </div>
            <div className="campo">
              <label>CPF para Certidão *</label>
              <input
                type="text"
                required
                value={cpfCertidao}
                onChange={(e) => setCpfCertidao(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="campo">
            <label>Nome do Responsável Legal *</label>
            <input
              type="text"
              required
              value={responsavelNome}
              onChange={(e) => setResponsavelNome(e.target.value)}
              placeholder="Nome do responsável..."
            />
          </div>

          <div className="form-grid-3">
            <div className="campo">
              <label>Unidade Escolar Indicada *</label>
              <select value={escolaId} onChange={(e) => setEscolaId(e.target.value)}>
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nome} ({esc.bairro})
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Etapa Solicitada *</label>
              <select value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaId)}>
                {ORDEM_ETAPAS.map((eid) => (
                  <option key={eid} value={eid}>
                    {ETAPAS[eid]?.nome ?? eid}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Período *</label>
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
                <option value="integral">Integral</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="campo">
              <label className="rotulo-destaque-perigo">Prazo Fatal (em Horas) *</label>
              <input
                type="number"
                required
                min="1"
                max="720"
                value={prazoHoras}
                onChange={(e) => setPrazoHoras(Number(e.target.value) || 48)}
                className="input-destaque-perigo"
              />
            </div>
            <div className="campo">
              <label>Multa Diária (Astreintes em R$)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={multaDiaria}
                onChange={(e) => setMultaDiaria(e.target.value)}
                placeholder="Ex: 500"
              />
            </div>
          </div>

          <div className="campo">
            <label>Observações / Teor da Decisão Liminar</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="form-botoes-acoes">
            <button type="button" className="btn btn-secundario" onClick={aoFechar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={salvando}>
              {salvando ? 'Autuando...' : 'Autuar Mandado Judicial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

