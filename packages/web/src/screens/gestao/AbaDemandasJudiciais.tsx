import { Icone } from '../../components/Icone';
import { ETAPAS } from '../../domain/etapas';
import { mascararProcessoCNJ, type DemandaJudicial } from '../../domain/types';

interface Props {
  demandasJudiciais: DemandaJudicial[];
  carregandoJudicial: boolean;
  agora: number;
  onAutuar: () => void;
  onAlocar: (demanda: DemandaJudicial) => void;
  onEmitirCertidao: (demandaId: string) => void;
}

export function AbaDemandasJudiciais({
  demandasJudiciais,
  carregandoJudicial,
  agora,
  onAutuar,
  onAlocar,
  onEmitirCertidao,
}: Props) {
  return (
    <section className="sec-bloco sec-bloco-coluna">
      <div className="sec-bloco-topo-wrap">
        <div>
          <h2 className="titulo-com-icone">
            <Icone nome="file-text" tamanho={22} /> Central de Demandas Judiciais & Liminares (PJ-e)
          </h2>
          <p className="legenda sem-margem-topo">
            Cumprimento tempestivo de decisões judiciais e tutela de urgência. Mitigação de astreintes (multas diárias) e emissão de Certidão Oficial com validação criptográfica SHA-256 para juntada aos autos.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primario btn-pequeno"
          onClick={onAutuar}
        >
          + Autuar Mandado Judicial
        </button>
      </div>

      {carregandoJudicial ? (
        <div className="estado-carregando-bloco">
          <Icone nome="hourglass" tamanho={24} />
          <p className="texto-carregando">Carregando processos judiciais autuados...</p>
        </div>
      ) : demandasJudiciais.length === 0 ? (
        <div className="estado-vazio-bloco">
          <Icone nome="check-circle" tamanho={32} />
          <p className="texto-vazio">
            Nenhuma ordem judicial pendente ou cadastrada no sistema.
          </p>
        </div>
      ) : (
        <div className="grid-demandas-judiciais">
          {demandasJudiciais.map((demanda) => {
            const prazoDate = new Date(demanda.prazoLimiteEm);
            const horasRestantes = Math.round((demanda.prazoLimiteEm - agora) / (1000 * 60 * 60));
            const estaVencendo = demanda.status === 'pendente' && horasRestantes <= 24 && horasRestantes > 0;
            const estaVencida = demanda.status === 'pendente' && horasRestantes <= 0;

            const statusClasse = demanda.status === 'alocado'
              ? 'status-alocado'
              : estaVencida || estaVencendo
              ? 'status-urgente'
              : '';

            return (
              <div key={demanda.id} className={`card-demanda-judicial ${statusClasse}`}>
                <div>
                  <div className="card-demanda-judicial-topo">
                    <span className="demanda-proc-badge" title={demanda.numeroProcesso}>
                      {mascararProcessoCNJ(demanda.numeroProcesso)}
                    </span>
                    <span className={`demanda-status-pill ${demanda.status === 'alocado' ? 'alocado' : estaVencida ? 'expirado' : 'pendente'}`}>
                      {demanda.status === 'alocado'
                        ? 'Alocado (Cumprida)'
                        : estaVencida
                        ? 'Prazo Expirado'
                        : 'Pendente'}
                    </span>
                  </div>

                  <h3 className="demanda-nome-aluno">
                    {demanda.estudanteNome}
                  </h3>
                  <p className="demanda-resp-info">
                    Responsável: <strong>{demanda.responsavelNome}</strong> (CPF: {demanda.cpfCertidao})
                  </p>

                  <div className="demanda-dados-lista">
                    <div className="demanda-dado-item">
                      <Icone nome="landmark" tamanho={14} />
                      <span><strong>Vara:</strong> {demanda.vara}</span>
                    </div>
                    <div className="demanda-dado-item">
                      <Icone nome="school" tamanho={14} />
                      <span><strong>Destino:</strong> {demanda.escolaNome} ({ETAPAS[demanda.etapa]?.nome ?? demanda.etapa})</span>
                    </div>
                    {demanda.multaDiaria ? (
                      <div className="demanda-astreinte-aviso">
                        <Icone nome="alert-triangle" tamanho={13} />
                        <span>Multa cominatória (astreinte): R$ {demanda.multaDiaria.toLocaleString('pt-BR')}/dia</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Contador do Prazo */}
                  {demanda.status !== 'alocado' && (
                    <div className={`demanda-prazo-box ${estaVencida ? 'expirado' : estaVencendo ? 'urgente' : ''}`}>
                      <div className={`prazo-box-titulo ${estaVencida ? 'texto-perigo' : estaVencendo ? 'texto-alerta' : 'texto-padrao'}`}>
                        <Icone nome="clock" tamanho={14} />
                        Prazo Fatal: {prazoDate.toLocaleDateString('pt-BR')} às {prazoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={`prazo-box-sub ${estaVencida ? 'texto-perigo' : 'texto-suave'}`}>
                        {estaVencida
                          ? `⚠️ Vencido há ${Math.abs(horasRestantes)} horas!`
                          : `Restam aproximadamente ${horasRestantes} horas para cumprimento.`}
                      </div>
                    </div>
                  )}

                  {demanda.protocoloCodigo && (
                    <div className="demanda-protocolo-vinculado">
                      Protocolo Vinculado: <span className="codigo-mono">{demanda.protocoloCodigo}</span>
                    </div>
                  )}
                </div>

                <div className="card-demanda-acoes">
                  {demanda.status !== 'alocado' ? (
                    <button
                      type="button"
                      className="btn btn-primario btn-pequeno btn-bloco-cheio"
                      onClick={() => onAlocar(demanda)}
                    >
                      <Icone nome="check-circle" tamanho={14} /> Alocar Vaga Prioritária
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secundario btn-pequeno btn-bloco-cheio"
                      onClick={() => onEmitirCertidao(demanda.id)}
                    >
                      <Icone nome="file-text" tamanho={14} /> Emitir Certidão (PJ-e)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

