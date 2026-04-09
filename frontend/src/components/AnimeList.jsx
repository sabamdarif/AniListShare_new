import useIsMobile from '../hooks/useIsMobile'

export default function AnimeList({
  animeList,
  loading,
  categoryId,
  isMobile: isMobileProp,
  onEditAnime,
  showEditColumn,
}) {
  const isMobileHook = useIsMobile()
  const isMobile = isMobileProp ?? isMobileHook

  if (loading) {
    return (
      <table className="anime_table" id="anime_table">
        <thead>
          <tr>
            <th className="col_id">#</th>
            <th className="col_thumb" />
            <th className="col_name">Name</th>
            <th className="col_season">Season</th>
            <th className="col_lang">Lang</th>
            <th className="col_stars">Stars</th>
            {showEditColumn && <th className="col_edit" />}
          </tr>
        </thead>
        <tbody id="anime_table_body">
          {[1, 2, 3, 4].map(i => (
            <tr key={i} className="skeleton_row">
              <td className="col_id"><span className="skel skel_text_sm" /></td>
              <td className="col_thumb"><span className="skel skel_thumb" /></td>
              <td className="col_name"><span className="skel skel_text" /></td>
              <td className="col_season"><span className="skel skel_badge" /></td>
              <td className="col_lang"><span className="skel skel_badge" /></td>
              <td className="col_stars"><span className="skel skel_text_sm" /></td>
              {showEditColumn && <td className="col_edit"><span className="skel skel_btn" /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (!categoryId) {
    return (
      <table className="anime_table" id="anime_table">
        <tbody id="anime_table_body">
          <tr>
            <td colSpan={showEditColumn ? 7 : 6} className="empty_msg">
              Create a category to get started.
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  if (animeList.length === 0) {
    return (
      <table className="anime_table" id="anime_table">
        <tbody id="anime_table_body">
          <tr>
            <td colSpan={showEditColumn ? 7 : 6} className="empty_msg">
              No anime in this category. Click &quot;Add Anime&quot; to start.
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  // ── Mobile card layout ──
  if (isMobile) {
    return (
      <div className="mobile_card_list" id="mobile_card_list">
        {animeList.map((anime, idx) => {
          const rating = anime.stars != null && !isNaN(parseFloat(anime.stars))
            ? parseFloat(anime.stars).toFixed(1)
            : '0.0'

          return (
            <div
              key={anime.id || anime.temp_id}
              className="m_card"
              data-anime-id={anime.id || anime.temp_id}
            >
              {anime.thumbnail_url ? (
                <img className="m_card_thumb" src={anime.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div className="thumb_placeholder m_card_thumb_placeholder">
                  <i className="nf nf-md-image_outline" />
                </div>
              )}
              <div className="m_card_body">
                <h3 className="m_card_title">{anime.name}</h3>
                {anime.seasons.length > 0 && (
                  <div className="m_card_seasons">
                    {anime.seasons.map((s, si) => {
                      const isOva = s.number % 1 !== 0
                      const displayName = isOva
                        ? 'OVA'
                        : `Season ${Math.floor(s.number)}`
                      const pct = s.is_completed
                        ? 100
                        : s.total_episodes > 0
                          ? Math.round((s.watched_episodes / s.total_episodes) * 100)
                          : 0
                      const hasComment = s.comment && String(s.comment).trim().length > 0

                      return (
                        <div
                          key={si}
                          className={`m_season_item${hasComment ? ' m_season_has_popup' : ''}`}
                          {...(hasComment ? {
                            'data-comment': s.comment,
                            'data-season': displayName,
                          } : {})}
                        >
                          <div className="m_season_label">
                            {s.is_completed ? (
                              <>
                                {displayName}
                                <span className="m_season_check">✓</span>
                              </>
                            ) : (
                              <>
                                {displayName}
                                {' '}
                                <span className="m_season_progress_text">
                                  {Number(s.watched_episodes)}/{Number(s.total_episodes)}
                                </span>
                              </>
                            )}
                            {hasComment && (
                              <i className="nf nf-fa-comment m_season_comment_icon" />
                            )}
                          </div>
                          <div className="m_season_bar_track">
                            <div
                              className={`m_season_bar_fill${s.is_completed ? ' m_bar_done' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="badge_wrap m_card_langs">
                  {anime.language && anime.language.split(',').map((lang, li) => (
                    <span key={li} className="badge badge_lang">{lang.trim()}</span>
                  ))}
                </div>
                <div className="m_card_footer">
                  <span className="m_card_rating">
                    <span className={`star single ${parseFloat(rating) > 0 ? 'filled' : 'empty'}`}>
                      {parseFloat(rating) > 0 ? '★' : '☆'}
                    </span>
                    {' '}{rating}
                  </span>
                  {showEditColumn && (
                    <button
                      className="edit_btn"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditAnime?.(anime, categoryId)
                      }}
                    >
                      <i className="nf nf-fa-pencil" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Desktop table layout ──
  return (
    <table className="anime_table" id="anime_table">
      <thead>
        <tr>
          <th className="col_id">#</th>
          <th className="col_thumb" />
          <th className="col_name">Name</th>
          <th className="col_season">Season</th>
          <th className="col_lang">Lang</th>
          <th className="col_stars">Stars</th>
          {showEditColumn && <th className="col_edit" />}
        </tr>
      </thead>
      <tbody id="anime_table_body">
        {animeList.map((anime, idx) => (
          <tr key={anime.id || anime.temp_id} data-anime-id={anime.id || anime.temp_id}>
            <td className="col_id">{idx + 1}</td>
            <td className="col_thumb">
              {anime.thumbnail_url ? (
                <img className="thumb_img" src={anime.thumbnail_url} alt="" loading="lazy" />
              ) : (
                <div className="thumb_placeholder thumb_img_placeholder">
                  <i className="nf nf-md-image_outline" />
                </div>
              )}
            </td>
            <td className="col_name">{anime.name}</td>
            <td className="col_season">
              <div className="season_wrap">
                {anime.seasons.length === 0 ? (
                  <span className="season_pill" style={{ opacity: 0.5 }}>—</span>
                ) : (
                  anime.seasons.map((s, si) => {
                    const isOva = s.number % 1 !== 0
                    const displayLabel = isOva ? 'OVA' : `S${Math.floor(s.number)}`
                    const dataSeasonLabel = isOva ? 'OVA' : `S${Math.floor(s.number)}`
                    const hasComment = s.comment && String(s.comment).trim().length > 0
                    const ovaCls = isOva ? ' season_ova' : ''

                    if (s.is_completed) {
                      return (
                        <span
                          key={si}
                          className={`season_pill season_has_tooltip${hasComment ? ' season_has_comment' : ''}${ovaCls}`}
                          {...(hasComment ? {
                            'data-comment': s.comment,
                            'data-season': dataSeasonLabel,
                          } : {})}
                        >
                          {displayLabel}
                          <span className="s_check">✓</span>
                          {hasComment && (
                            <i className="nf nf-fa-comment season_comment_icon" />
                          )}
                        </span>
                      )
                    }

                    const pct = s.total_episodes > 0
                      ? Math.round((s.watched_episodes / s.total_episodes) * 100)
                      : 0

                    return (
                      <span
                        key={si}
                        className={`season_progress_box season_has_tooltip${hasComment ? ' season_has_comment' : ''}${ovaCls}`}
                        {...(hasComment ? {
                          'data-comment': s.comment,
                          'data-season': dataSeasonLabel,
                        } : {})}
                      >
                        <span className="season_progress_top">
                          <span className="season_progress_label">{displayLabel}</span>
                          <span className="season_progress_frac">
                            {Number(s.watched_episodes)}/{Number(s.total_episodes)}
                          </span>
                        </span>
                        <span className="season_progress_track">
                          <span
                            className="season_progress_fill"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        {hasComment && (
                          <i className="nf nf-fa-comment season_comment_icon" />
                        )}
                      </span>
                    )
                  })
                )}
              </div>
            </td>
            <td className="col_lang">
              {anime.language && (
                <div className="badge_wrap">
                  {anime.language.split(',').map((lang, li) => (
                    <span key={li} className="badge badge_lang">{lang.trim()}</span>
                  ))}
                </div>
              )}
            </td>
            <td className="col_stars">
              {anime.stars != null && (
                <span className="star_display">
                  <span className={`star single ${parseFloat(anime.stars) > 0 ? 'filled' : 'empty'}`}>
                    {parseFloat(anime.stars) > 0 ? '★' : '☆'}
                  </span>
                  <span className="star_num">{parseFloat(anime.stars).toFixed(1)}</span>
                </span>
              )}
            </td>
            {showEditColumn && (
              <td className="col_edit">
                <button
                  type="button"
                  className="edit_btn"
                  aria-label="Edit"
                  onClick={() => onEditAnime?.(anime, categoryId)}
                >
                  <i className="nf nf-fa-pencil" />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
