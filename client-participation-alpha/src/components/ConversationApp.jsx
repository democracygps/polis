import React, { useEffect, useState } from 'react';
import TreeviteLoginCodeModal from './TreeviteLoginCodeModal.jsx';
import TopicAgenda from './topicAgenda/TopicAgenda.jsx';
import Survey from './Survey.jsx';
import SurveyForm from './SurveyForm.jsx';
import TreeviteInvites from './TreeviteInvites.jsx';
import VisualizationContainer from './VisualizationContainer';
import PolisNet from '../lib/net';
import { marked } from 'marked';

// Mirrors the synchronous JWT handling the SSR page used to do inline
// before any React component read localStorage; safe to run async here
// since children are only rendered after this resolves.
function storeJwtFromInitialData(initialData) {
  const token = initialData?.auth?.token;
  if (!token) return;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const conversationId = payload.conversation_id;

      if (conversationId && window.localStorage) {
        const tokenKey = 'participant_token_' + conversationId;
        window.localStorage.setItem(tokenKey, token);
        window.dispatchEvent(new CustomEvent('polis-token-update', {
          detail: { conversation_id: conversationId }
        }));
      }
    }
  } catch (e) {
    console.error('[Token] Error storing JWT:', e);
  }
}

export default function ConversationApp({ conversation_id, s }) {
  const [initialData, setInitialData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const xid = searchParams.get('xid');
        const x_name = searchParams.get('x_name');
        const x_profile_image_url = searchParams.get('x_profile_image_url');

        const apiParams = { conversation_id, includePCA: false };
        if (xid) apiParams.xid = xid;
        if (x_name) apiParams.x_name = x_name;
        if (x_profile_image_url) apiParams.x_profile_image_url = x_profile_image_url;

        const data = await PolisNet.polisGet('/participationInit', apiParams);
        if (cancelled) return;

        storeJwtFromInitialData(data);
        setInitialData(data);
      } catch (error) {
        console.error('Failed to fetch conversation data:', error);
        if (cancelled) return;

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorResponseText = error && typeof error === 'object' && 'responseText' in error
          ? String(error.responseText)
          : '';

        if (errorResponseText.includes('polis_err_xid_required')) {
          setFetchError(s.xidRequired || 'This conversation requires an XID (external identifier) to participate. Please use the proper link provided to you.');
        } else {
          setFetchError(`Could not load this conversation. Error: ${errorMessage}. Please check the ID and try again.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  // Run once per conversation on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation_id]);

  useEffect(() => {
    if (initialData?.conversation?.topic) {
      document.title = initialData.conversation.topic;
    }
  }, [initialData]);

  if (loading) {
    return (
      <div className="loading-conversation" role="status" aria-live="polite">
        <div className="loading-conversation-spinner" />
        <p>{s.loadingConversation || 'Loading conversation...'}</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="error-message">
        <h2>Oops!</h2>
        <p>{fetchError}</p>
      </div>
    );
  }

  if (!initialData) {
    return <p>Loading...</p>;
  }

  const surveyDetails = {
    title: initialData.conversation.topic,
    description: initialData.conversation.description,
    requiresInviteCode: initialData.conversation.treevite_enabled,
  };

  const firstStatement = {
    tid: initialData.nextComment?.tid,
    txt: initialData.nextComment?.txt,
    remaining: initialData.nextComment?.remaining,
  };

  const isConversationActive = initialData.conversation.is_active;

  return (
    <>
      <h1>
        {surveyDetails.title}
        {!isConversationActive && <span className="closed-badge">closed</span>}
      </h1>
      <p className="description" dangerouslySetInnerHTML={{ __html: marked.parse(surveyDetails.description) }} />

      {isConversationActive ? (
        <>
          {surveyDetails.requiresInviteCode && (<TreeviteLoginCodeModal s={s} />)}
          <TopicAgenda
            conversation_id={conversation_id}
            requiresInviteCode={surveyDetails.requiresInviteCode}
            s={s}
          />
          <p className="conversation-intro" dangerouslySetInnerHTML={{ __html: s.participantHelpWelcomeText }} />
          <Survey
            initialStatement={firstStatement}
            conversation_id={initialData.conversation.conversation_id}
            s={s}
            requiresInviteCode={surveyDetails.requiresInviteCode}
          />
          <SurveyForm s={s} conversation_id={conversation_id} requiresInviteCode={surveyDetails.requiresInviteCode} />
          {surveyDetails.requiresInviteCode && (<TreeviteInvites conversation_id={conversation_id} s={s} />)}
        </>
      ) : (
        <div className="footer-spacer"></div>
      )}

      {initialData.conversation.vis_type === 1 && (
        <VisualizationContainer conversation_id={conversation_id} />
      )}
    </>
  );
}
