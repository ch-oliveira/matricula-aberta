import { Icone, IconeDocumento } from '../../components/Icone';
import { toast } from '../../components/Toasts';
import type { Documento } from '../../domain/types';

interface Props {
  docs: Documento[];
  marcados: string[];
  progressoId: string;
  onAlternarDoc: (id: string) => void;
  fotosDocs: Record<string, string>;
  setFotosDocs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function ChecklistDocumentos({
  docs,
  marcados,
  progressoId,
  onAlternarDoc,
  fotosDocs,
  setFotosDocs,
}: Props) {
  const obrig = docs.filter((d) => d.obrigatorio);
  const feitos = obrig.filter((d) => marcados.includes(d.id)).length;
  const completo = feitos >= obrig.length;

  return (
    <>
      <div className="checklist">
        <div className="checklist-topo">
          <h2 id={progressoId}><Icone nome="list" tamanho={20} /> Checklist de documentos (Patos - PB)</h2>
          <span className="checklist-contagem">
            {feitos}/{obrig.length}
          </span>
        </div>
        <progress className="barra-progresso" max={Math.max(1, obrig.length)} value={feitos} aria-labelledby={progressoId} />
        <p className="checklist-sub">
          {completo ? (
            <>
              <Icone nome="sparkles" tamanho={16} /> Tudo pronto! Seus documentos obrigatórios estão completos.
            </>
          ) : (
            'Marque os documentos que você já separou. Fica salvo no seu celular.'
          )}
        </p>

        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id}>
              <label className={`doc ${marcados.includes(d.id) ? 'doc-ok' : ''}`}>
                <input type="checkbox" checked={marcados.includes(d.id)} onChange={() => onAlternarDoc(d.id)} />
                <span className="doc-check" aria-hidden="true" />
                <span className="doc-emoji" aria-hidden="true">
                  <IconeDocumento id={d.id} icone={d.emoji} tamanho={22} />
                </span>
                <span className="doc-textos">
                  <span className="doc-nome">
                    {d.nome}
                    {!d.obrigatorio && <em className="doc-opcional">se tiver</em>}
                  </span>
                  <span className="doc-dica">{d.dica}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: '16px', padding: '14px', background: 'var(--surface, #FFF)', border: '2px dashed var(--line, #171625)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Icone nome="camera" tamanho={18} />
            <strong style={{ fontSize: '0.92rem' }}>Fotografar documentos para levar no celular (Opcional)</strong>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#676479' }}>
            Você pode fotografar os documentos agora. As fotos ficam salvas no seu aparelho para agilizar a conferência na escola.
          </p>
          <label className="btn btn-secundario btn-pequeno" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <Icone nome="camera" tamanho={15} />
            <span>Tirar foto ou anexar imagem</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const url = ev.target?.result as string;
                  setFotosDocs((ant) => ({ ...ant, [Date.now()]: url }));
                  toast('Foto do documento salva no seu celular!', { emoji: 'check-circle', tom: 'ok' });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {Object.keys(fotosDocs).length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {Object.entries(fotosDocs).map(([k, foto]) => (
                <div key={k} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '2px solid var(--line, #171625)' }}>
                  <img src={foto} alt="Documento anexado" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    style={{ position: 'absolute', top: 0, right: 0, background: '#D32F2F', color: '#fff', border: 'none', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => {
                      setFotosDocs((ant) => {
                        const cp = { ...ant };
                        delete cp[k];
                        return cp;
                      });
                    }}
                    title="Remover foto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= GUIA LOCAL: ONDE EMITIR EM PATOS - PB ================= */}
      <div className="guia-documentos-patos" aria-labelledby="t-onde-emitir">
        <div className="guia-documentos-topo">
          <span className="guia-documentos-icone" aria-hidden="true">
            <Icone nome="map" tamanho={22} />
          </span>
          <div>
            <h3 id="t-onde-emitir">Não tem algum documento? Onde emitir em Patos - PB:</h3>
            <p>Serviços públicos gratuitos na cidade para regularizar a documentação da criança</p>
          </div>
        </div>

        <div className="guia-locais-grade">
          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Documentos Pessoais</span>
              <h4>Casa da Cidadania · Patos - PB</h4>
            </div>
            <p className="guia-local-desc">
              Emissão de RG / Carteira de Identidade Nacional (CIN), CPF e 2ª via de Certidão.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> <strong>Guedes Shopping (1º piso)</strong> · R. Pedro Firmino, Centro / Alça Sudeste · Seg a sex, 7h às 17h
            </p>
          </article>

          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Saúde da Criança</span>
              <h4>UBS do seu bairro (Postos de Saúde)</h4>
            </div>
            <p className="guia-local-desc">
              Emissão do Cartão SUS e atualização da caderneta de vacinação exigida para matrícula.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> Em qualquer UBS de Patos (ex.: UBS Aderbal Martins no Belo Horizonte, UBS Jatobá, UBS Centro)
            </p>
          </article>

          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Prioridade Social</span>
              <h4>CRAS / CadÚnico (Bolsa Família)</h4>
            </div>
            <p className="guia-local-desc">
              Comprovante do Número do NIS e atualização do CadÚnico para prioridade em vagas de creche.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> CRAS Geralda Medeiros (São Sebastião) · CRAS Capitão Manoel Gomes (Belo Horizonte) · CRAS Morro
            </p>
          </article>

          <article className="guia-local-item">
            <div className="guia-local-cabecalho">
              <span className="guia-local-tag">Residência & Histórico</span>
              <h4>SEDUC & Concessionárias</h4>
            </div>
            <p className="guia-local-desc">
              Fatura da Energisa PB ou Cagepa; Declaração de transferência na secretaria da escola anterior ou SEDUC.
            </p>
            <p className="guia-local-endereco">
              <Icone nome="pin" tamanho={14} /> SEDUC: R. Horácio Nóbrega, Belo Horizonte / Centro · Atendimento das 7h às 13h
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
