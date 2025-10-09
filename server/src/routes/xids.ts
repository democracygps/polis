import { failJson } from "../utils/fail";
import pg from "../db/pg-query";
import Utils from "../utils/common";
import type { ExpressRequest, ExpressResponse } from "../d";

// Types for better type safety
interface GetXidsRequest extends ExpressRequest {
  p: {
    uid?: number;
    zid: number;
  };
}

interface PostXidWhitelistRequest extends ExpressRequest {
  p: {
    xid_whitelist: string[];
    uid?: number;
  };
}

interface StandardResponse extends ExpressResponse {
  status: (code: number) => { json: (data: unknown) => void };
}

type XidRow = { pid: number; xid: string };

async function getXids(zid: number): Promise<XidRow[]> {
  try {
    const rows = (await pg.queryP_readOnly<XidRow>(
      "select pid, xid from xids inner join " +
        "(select * from participants where zid = ($1)) as p on xids.uid = p.uid " +
        " where owner in (select org_id from conversations where zid = ($1));",
      [zid]
    )) as XidRow[];
    return rows;
  } catch (err) {
    throw new Error("polis_err_fetching_xids");
  }
}

async function handle_GET_xids(
  req: GetXidsRequest,
  res: StandardResponse
): Promise<void> {
  const { uid, zid } = req.p;

  try {
    const isOwner = await Utils.isOwner(zid, uid);

    if (!isOwner) {
      return failJson(res, 403, "polis_err_get_xids_not_authorized");
    }

    const xids = await getXids(zid);
    res.status(200).json(xids);
  } catch (err) {
    failJson(res, 500, "polis_err_get_xids", err);
  }
}

async function handle_POST_xidWhitelist(
  req: PostXidWhitelistRequest,
  res: StandardResponse
): Promise<void> {
  const { xid_whitelist, uid: owner } = req.p;

  if (!owner) {
    return failJson(res, 400, "polis_err_missing_owner");
  }

  try {
    const entries: string[] = xid_whitelist.map(
      (xid) => `(${Utils.escapeLiteral(xid)},${owner})`
    );

    await pg.queryP(
      "insert into xid_whitelist (xid, owner) values " +
        entries.join(",") +
        " on conflict do nothing;",
      []
    );

    res.status(200).json({});
  } catch (err) {
    failJson(res, 500, "polis_err_POST_xidWhitelist", err);
  }
}

export { getXids, handle_GET_xids, handle_POST_xidWhitelist };
