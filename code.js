// Minimal plugin host stub — preserving folder creation/storage logic only
// Full plugin logic was intentionally removed. You'll re-describe desired
// behavior and I'll implement it based on your specification.

figma.showUI(__html__, { width: 400, height: 700, title: "Asset's Diary" });

const DRIVE_SETTINGS_STORAGE_KEY = 'assets-diary-drive-settings';
const LOCAL_FOLDERS_STORAGE_KEY = 'assets-diary-local-folders';
const FIXED_DRIVE_FOLDER_ID = null;
const DEFAULT_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const DEFAULT_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
const DEFAULT_REFRESH_TOKEN = 'YOUR_GOOGLE_REFRESH_TOKEN';
const DEFAULT_FOLDER_ID = '1_Ix6ouGX73QEjNk13Bckjifwywiskc04';

let footerFolders = [];
let driveConfig = {
  folderId: DEFAULT_FOLDER_ID,
  token: null,
  refreshToken: DEFAULT_REFRESH_TOKEN,
  clientId: DEFAULT_CLIENT_ID,
  clientSecret: DEFAULT_CLIENT_SECRET,
  tokenExpiresAt: 0,
  indexFileId: null,
  rememberDriveSettings: true,
  rememberToken: true,
  rememberRefreshToken: true,
  rememberClientId: true,
  rememberClientSecret: true
};

const USER_SESSION_KEY = 'assets-diary-user-session';
const USERS_REGISTRY_KEY = 'assets-diary-users-registry';
const USERS_REGISTRY_BACKUP_KEY = 'assets-diary-users-registry-backup';
const REMEMBERED_CREDS_KEY = 'assets-diary-remembered-creds';
const LICENSE_KEY_STORAGE_KEY = 'assets-diary-license-key';

let currentUser = null; // { uid, email, role }
let isProUser = false;

function getStorageKeyForUser(user) {
  if (!user || !user.uid) return 'assets-diary-folders-guest';
  return `assets-diary-folders-${user.uid}`;
}

function getPendingUploadsKeyForUser(user) {
  if (!user || !user.uid) return 'assets-diary-pending-uploads-guest';
  return `assets-diary-pending-uploads-${user.uid}`;
}

function getUserIndexFilename(user) {
  if (!user || !user.uid) return 'assets-diary-index-guest.json';
  return `assets-diary-index-${user.uid}.json`;
}

function getUserBackupIndexFilename(user) {
  if (!user || !user.uid) return 'assets-diary-index-guest-backup.json';
  return `assets-diary-index-${user.uid}-backup.json`;
}

function getTrashKeyForUser(user) {
  if (!user || !user.uid) return 'assets-diary-trash-guest';
  return `assets-diary-trash-${user.uid}`;
}

let trashItems = [];

async function loadLocalTrash() {
  try {
    const key = getTrashKeyForUser(currentUser);
    const backupKey = `${key}-backup`;

    let stored = await figma.clientStorage.getAsync(key);
    if (!Array.isArray(stored) || stored.length === 0) {
      stored = await figma.clientStorage.getAsync(backupKey);
    }
    if (!Array.isArray(stored) || stored.length === 0) {
      const guest = await figma.clientStorage.getAsync('assets-diary-trash-guest');
      if (Array.isArray(guest) && guest.length > 0) stored = guest;
    }
    if (!Array.isArray(stored) || stored.length === 0) {
      const legacy = await figma.clientStorage.getAsync('assets-diary-trash');
      if (Array.isArray(legacy) && legacy.length > 0) stored = legacy;
    }

    const fetched = Array.isArray(stored) ? stored : [];

    const combined = [...trashItems, ...fetched];
    const uniqueMap = new Map();
    combined.forEach(item => {
      if (item && item.trashId && !uniqueMap.has(item.trashId)) {
        uniqueMap.set(item.trashId, item);
      }
    });

    trashItems = Array.from(uniqueMap.values());
  } catch (e) {
    if (!Array.isArray(trashItems)) trashItems = [];
  }
  return trashItems;
}

async function saveLocalTrash() {
  try {
    const key = getTrashKeyForUser(currentUser);
    const cleanTrash = JSON.parse(JSON.stringify(trashItems));
    await figma.clientStorage.setAsync(key, cleanTrash);
    await figma.clientStorage.setAsync(`${key}-backup`, cleanTrash);
    await figma.clientStorage.setAsync('assets-diary-trash-guest', cleanTrash);
  } catch (e) {}
  safePostMessage({ type: 'trash-items-list', items: trashItems });
}

let driveIndexSaveTimer = null;
let isProcessingQueue = false;

function scheduleDriveIndexSave() {
  if (driveIndexSaveTimer) clearTimeout(driveIndexSaveTimer);
  driveIndexSaveTimer = setTimeout(() => {
    driveSaveIndex().catch(() => {});
  }, 1500);
}

const DEFAULT_EXAMPLE_COLLECTIONS = [
  {
    "name": "Button",
    "styles": [
      {
        "title": "Frame 590",
        "width": 181,
        "height": 48,
        "createdAt": "2026-08-09T22:08:14.169Z",
        "nodeData": {
          "type": "FRAME",
          "name": "Frame 590",
          "visible": true,
          "locked": false,
          "opacity": 1,
          "blendMode": "PASS_THROUGH",
          "rotation": 0,
          "x": 3990,
          "y": 3748,
          "width": 181,
          "height": 48,
          "isMask": false,
          "maskType": "ALPHA",
          "constraints": {
            "horizontal": "MIN",
            "vertical": "MIN"
          },
          "cornerRadius": 36,
          "topLeftRadius": 36,
          "topRightRadius": 36,
          "bottomRightRadius": 36,
          "bottomLeftRadius": 36,
          "cornerSmoothing": 0,
          "layoutAlign": "INHERIT",
          "layoutGrow": 0,
          "layoutSizingHorizontal": "HUG",
          "layoutSizingVertical": "FIXED",
          "layoutPositioning": "AUTO",
          "fills": [
            {
              "type": "SOLID",
              "visible": true,
              "opacity": 1,
              "blendMode": "NORMAL",
              "color": {
                "r": 0.040855731815099716,
                "g": 0.1462036371231079,
                "b": 0.37728941440582275,
                "a": 1
              }
            }
          ],
          "relativeTransform": [
            [
              1,
              0,
              3990
            ],
            [
              0,
              1,
              3748
            ]
          ],
          "layoutMode": "HORIZONTAL",
          "clipsContent": false,
          "itemSpacing": 10,
          "paddingLeft": 24,
          "paddingRight": 24,
          "paddingTop": 0,
          "paddingBottom": 0,
          "counterAxisSpacing": 0,
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "primaryAxisSizingMode": "AUTO",
          "counterAxisSizingMode": "FIXED",
          "children": [
            {
              "type": "TEXT",
              "name": "New account",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 24,
              "y": 18,
              "width": 104,
              "height": 12,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "HUG",
              "layoutSizingVertical": "HUG",
              "layoutPositioning": "AUTO",
              "characters": "New account",
              "fontSize": 16,
              "fontName": {
                "family": "Inter",
                "style": "Bold"
              },
              "textAlignHorizontal": "LEFT",
              "textAlignVertical": "TOP",
              "textAutoResize": "WIDTH_AND_HEIGHT",
              "letterSpacing": {
                "value": 0.5,
                "unit": "PERCENT"
              },
              "lineHeight": {
                "unit": "AUTO"
              },
              "paragraphSpacing": 28,
              "paragraphIndent": 0,
              "textDecoration": "NONE",
              "textCase": "ORIGINAL",
              "leadingTrim": "CAP_HEIGHT",
              "fills": [
                {
                  "type": "SOLID",
                  "visible": true,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 1,
                    "g": 1,
                    "b": 1,
                    "a": 1
                  }
                }
              ],
              "relativeTransform": [
                [
                  1,
                  0,
                  24
                ],
                [
                  0,
                  1,
                  18
                ]
              ]
            },
            {
              "type": "FRAME",
              "name": "Frame",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 138,
              "y": 14.5,
              "width": 19,
              "height": 19,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "cornerRadius": 0,
              "topLeftRadius": 0,
              "topRightRadius": 0,
              "bottomRightRadius": 0,
              "bottomLeftRadius": 0,
              "cornerSmoothing": 0,
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "FIXED",
              "layoutSizingVertical": "FIXED",
              "layoutPositioning": "AUTO",
              "fills": [
                {
                  "type": "SOLID",
                  "visible": false,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 1,
                    "g": 1,
                    "b": 1,
                    "a": 1
                  }
                }
              ],
              "relativeTransform": [
                [
                  1,
                  0,
                  138
                ],
                [
                  0,
                  1,
                  14.5
                ]
              ],
              "layoutMode": "NONE",
              "clipsContent": true,
              "itemSpacing": 0,
              "paddingLeft": 0,
              "paddingRight": 0,
              "paddingTop": 0,
              "paddingBottom": 0,
              "counterAxisSpacing": 0,
              "primaryAxisAlignItems": "MIN",
              "counterAxisAlignItems": "MIN",
              "primaryAxisSizingMode": "AUTO",
              "counterAxisSizingMode": "FIXED",
              "children": [
                {
                  "type": "GROUP",
                  "name": "Group",
                  "visible": true,
                  "locked": false,
                  "opacity": 1,
                  "blendMode": "PASS_THROUGH",
                  "rotation": 0,
                  "x": 1.5833332538604736,
                  "y": 1.5833332538604736,
                  "width": 15.833333015441895,
                  "height": 15.833333015441895,
                  "isMask": false,
                  "maskType": "ALPHA",
                  "layoutAlign": "INHERIT",
                  "layoutGrow": 0,
                  "layoutSizingHorizontal": "FIXED",
                  "layoutSizingVertical": "FIXED",
                  "layoutPositioning": "AUTO",
                  "relativeTransform": [
                    [
                      1,
                      0,
                      1.5833332538604736
                    ],
                    [
                      0,
                      1,
                      1.5833332538604736
                    ]
                  ],
                  "layoutMode": "NONE",
                  "clipsContent": false,
                  "itemSpacing": 0,
                  "paddingLeft": 0,
                  "paddingRight": 0,
                  "paddingTop": 0,
                  "paddingBottom": 0,
                  "counterAxisSpacing": 0,
                  "primaryAxisAlignItems": "MIN",
                  "counterAxisAlignItems": "MIN",
                  "primaryAxisSizingMode": "FIXED",
                  "counterAxisSizingMode": "FIXED",
                  "children": [
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "visible": true,
                      "locked": false,
                      "opacity": 1,
                      "blendMode": "PASS_THROUGH",
                      "rotation": 0,
                      "x": 1.5833332538604736,
                      "y": 1.5833332538604736,
                      "width": 15.833333015441895,
                      "height": 15.833333015441895,
                      "isMask": false,
                      "maskType": "ALPHA",
                      "constraints": {
                        "horizontal": "SCALE",
                        "vertical": "SCALE"
                      },
                      "cornerRadius": 0,
                      "cornerSmoothing": 0,
                      "layoutAlign": "INHERIT",
                      "layoutGrow": 0,
                      "layoutSizingHorizontal": "FIXED",
                      "layoutSizingVertical": "FIXED",
                      "layoutPositioning": "AUTO",
                      "vectorPaths": [
                        {
                          "data": "M 0 7.916666507720947 C 0 3.544291782744722 3.544291782744722 0 7.916666507720947 0 C 12.289041232697173 0 15.833333015441895 3.544291782744722 15.833333015441895 7.916666507720947 C 15.833333015441895 12.289041232697173 12.289041232697173 15.833333015441895 7.916666507720947 15.833333015441895 C 3.544291782744722 15.833333015441895 0 12.289041232697173 0 7.916666507720947 Z M 4.749999904632569 7.124999856948853 C 4.540036846690838 7.124999856948853 4.338673491466168 7.208407508769917 4.190207198573853 7.356873801662232 C 4.0417409056815385 7.505340094554547 3.9583332538604736 7.706703449779217 3.9583332538604736 7.916666507720947 C 3.9583332538604736 8.126629565662679 4.0417409056815385 8.327992920887347 4.190207198573853 8.476459213779663 C 4.338673491466168 8.624925506671978 4.540036846690838 8.708333158493042 4.749999904632569 8.708333158493042 L 9.172250166161849 8.708333158493042 L 7.356958360783255 10.523624963871635 C 7.212749893319136 10.672935007680815 7.132954382007182 10.872911324354742 7.1347581305134105 11.08048377042769 C 7.136561879019639 11.288056216500639 7.219820453806347 11.4866163212552 7.366601875540709 11.633397742989564 C 7.513383297275072 11.780179164723927 7.711943402029636 11.863438494502788 7.919515848102583 11.865242243009016 C 8.12708829417553 11.867045991515244 8.32706461084946 11.78725048020329 8.47637465465864 11.643042012739171 L 11.643042012739171 8.47637465465864 C 11.791456600465827 8.32791523927296 11.87483064333937 8.126588135468337 11.874830643339374 7.916666507720947 C 11.874830643339374 7.706744879973558 11.791456600465827 7.505417776168936 11.643042012739171 7.356958360783255 L 8.47637465465864 4.190291757694877 C 8.403345909442955 4.1146795178107025 8.315989754837718 4.054368497427878 8.219403260828585 4.012878039377552 C 8.122816766819453 3.971387581327225 8.018934123027442 3.949548440099468 7.913817167339312 3.9486350021720003 C 7.808700211651182 3.9477215642445325 7.70445418659739 3.967751910720909 7.607161249970659 4.007557609682431 C 7.509868313343928 4.047363308643953 7.421477447892757 4.106147027090297 7.347145727783754 4.1804787471993 C 7.272814007674752 4.254810467308302 7.214030289228408 4.343201710255549 7.174224590266886 4.44049464688228 C 7.134418891305364 4.537787583509012 7.114387789836836 4.642033986058879 7.115301227764303 4.747150941747009 C 7.11621466569177 4.852267897435139 7.138053806919529 4.956150163731073 7.179544264969855 5.052736657740207 C 7.221034723020181 5.14932315174934 7.281346120899081 5.236679306354576 7.356958360783255 5.309708051570261 L 9.172250166161849 7.124999856948853 L 4.749999904632569 7.124999856948853 Z",
                          "windingRule": "EVENODD"
                        }
                      ],
                      "vectorNetwork": {
                        "vertices": [
                          {
                            "x": 0,
                            "y": 7.916666507720947,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.916666507720947,
                            "y": 0,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 15.833333015441895,
                            "y": 7.916666507720947,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.916666507720947,
                            "y": 15.833333015441895,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 4.749999904632569,
                            "y": 7.124999856948853,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 4.190207198573853,
                            "y": 7.356873801662232,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 3.9583332538604736,
                            "y": 7.916666507720947,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 4.190207198573853,
                            "y": 8.476459213779663,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 4.749999904632569,
                            "y": 8.708333158493042,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 9.172250166161849,
                            "y": 8.708333158493042,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.356958360783255,
                            "y": 10.523624963871635,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.1347581305134105,
                            "y": 11.08048377042769,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.366601875540709,
                            "y": 11.633397742989564,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.919515848102583,
                            "y": 11.865242243009016,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 8.47637465465864,
                            "y": 11.643042012739171,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 11.643042012739171,
                            "y": 8.47637465465864,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 11.874830643339374,
                            "y": 7.916666507720947,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 11.643042012739171,
                            "y": 7.356958360783255,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 8.47637465465864,
                            "y": 4.190291757694877,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 8.219403260828585,
                            "y": 4.012878039377552,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.913817167339312,
                            "y": 3.9486350021720003,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.607161249970659,
                            "y": 4.007557609682431,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.347145727783754,
                            "y": 4.1804787471993,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.174224590266886,
                            "y": 4.44049464688228,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.115301227764303,
                            "y": 4.747150941747009,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.179544264969855,
                            "y": 5.052736657740207,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 7.356958360783255,
                            "y": 5.309708051570261,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          },
                          {
                            "x": 9.172250166161849,
                            "y": 7.124999856948853,
                            "strokeCap": "NONE",
                            "strokeJoin": "MITER",
                            "cornerRadius": 0,
                            "handleMirroring": "NONE"
                          }
                        ],
                        "segments": [
                          {
                            "start": 0,
                            "end": 1,
                            "tangentStart": {
                              "x": 0,
                              "y": -4.3723747249762255
                            },
                            "tangentEnd": {
                              "x": -4.3723747249762255,
                              "y": 0
                            }
                          },
                          {
                            "start": 1,
                            "end": 2,
                            "tangentStart": {
                              "x": 4.3723747249762255,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": -4.3723747249762255
                            }
                          },
                          {
                            "start": 2,
                            "end": 3,
                            "tangentStart": {
                              "x": 0,
                              "y": 4.3723747249762255
                            },
                            "tangentEnd": {
                              "x": 4.3723747249762255,
                              "y": 0
                            }
                          },
                          {
                            "start": 3,
                            "end": 0,
                            "tangentStart": {
                              "x": -4.3723747249762255,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 4.3723747249762255
                            }
                          },
                          {
                            "start": 4,
                            "end": 5,
                            "tangentStart": {
                              "x": -0.20996305794173084,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0.14846629289231503,
                              "y": -0.14846629289231503
                            }
                          },
                          {
                            "start": 5,
                            "end": 6,
                            "tangentStart": {
                              "x": -0.14846629289231503,
                              "y": 0.14846629289231503
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": -0.20996305794173084
                            }
                          },
                          {
                            "start": 6,
                            "end": 7,
                            "tangentStart": {
                              "x": 0,
                              "y": 0.20996305794173084
                            },
                            "tangentEnd": {
                              "x": -0.14846629289231503,
                              "y": -0.14846629289231503
                            }
                          },
                          {
                            "start": 7,
                            "end": 8,
                            "tangentStart": {
                              "x": 0.14846629289231503,
                              "y": 0.14846629289231503
                            },
                            "tangentEnd": {
                              "x": -0.20996305794173084,
                              "y": 0
                            }
                          },
                          {
                            "start": 8,
                            "end": 9,
                            "tangentStart": {
                              "x": 0,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 0
                            }
                          },
                          {
                            "start": 9,
                            "end": 10,
                            "tangentStart": {
                              "x": 0,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 0
                            }
                          },
                          {
                            "start": 10,
                            "end": 11,
                            "tangentStart": {
                              "x": -0.1442084674641201,
                              "y": 0.14931004380918084
                            },
                            "tangentEnd": {
                              "x": -0.0018037485062284198,
                              "y": -0.20757244607294753
                            }
                          },
                          {
                            "start": 11,
                            "end": 12,
                            "tangentStart": {
                              "x": 0.0018037485062284198,
                              "y": 0.20757244607294753
                            },
                            "tangentEnd": {
                              "x": -0.146781421734363,
                              "y": -0.146781421734363
                            }
                          },
                          {
                            "start": 12,
                            "end": 13,
                            "tangentStart": {
                              "x": 0.146781421734363,
                              "y": 0.146781421734363
                            },
                            "tangentEnd": {
                              "x": -0.20757244607294753,
                              "y": -0.0018037485062284198
                            }
                          },
                          {
                            "start": 13,
                            "end": 14,
                            "tangentStart": {
                              "x": 0.20757244607294753,
                              "y": 0.0018037485062284198
                            },
                            "tangentEnd": {
                              "x": -0.14931004380918084,
                              "y": 0.1442084674641201
                            }
                          },
                          {
                            "start": 14,
                            "end": 15,
                            "tangentStart": {
                              "x": 0,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 0
                            }
                          },
                          {
                            "start": 15,
                            "end": 16,
                            "tangentStart": {
                              "x": 0.1484145877266556,
                              "y": -0.14845941538568042
                            },
                            "tangentEnd": {
                              "x": -2.8125649392482e-15,
                              "y": 0.20992162774739
                            }
                          },
                          {
                            "start": 16,
                            "end": 17,
                            "tangentStart": {
                              "x": 0,
                              "y": -0.20992162774739
                            },
                            "tangentEnd": {
                              "x": 0.1484145877266556,
                              "y": 0.14845941538568042
                            }
                          },
                          {
                            "start": 17,
                            "end": 18,
                            "tangentStart": {
                              "x": 0,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 0
                            }
                          },
                          {
                            "start": 18,
                            "end": 19,
                            "tangentStart": {
                              "x": -0.07302874521568477,
                              "y": -0.07561223988417468
                            },
                            "tangentEnd": {
                              "x": 0.09658649400913326,
                              "y": 0.041490458050326494
                            }
                          },
                          {
                            "start": 19,
                            "end": 20,
                            "tangentStart": {
                              "x": -0.09658649400913326,
                              "y": -0.041490458050326494
                            },
                            "tangentEnd": {
                              "x": 0.10511695568812983,
                              "y": 0.0009134379274676252
                            }
                          },
                          {
                            "start": 20,
                            "end": 21,
                            "tangentStart": {
                              "x": -0.10511695568812983,
                              "y": -0.0009134379274676252
                            },
                            "tangentEnd": {
                              "x": 0.09729293662673087,
                              "y": -0.03980569896152204
                            }
                          },
                          {
                            "start": 21,
                            "end": 22,
                            "tangentStart": {
                              "x": -0.09729293662673087,
                              "y": 0.03980569896152204
                            },
                            "tangentEnd": {
                              "x": 0.07433172010900257,
                              "y": -0.07433172010900257
                            }
                          },
                          {
                            "start": 22,
                            "end": 23,
                            "tangentStart": {
                              "x": -0.07433172010900257,
                              "y": 0.07433172010900257
                            },
                            "tangentEnd": {
                              "x": 0.03980569896152204,
                              "y": -0.09729293662673087
                            }
                          },
                          {
                            "start": 23,
                            "end": 24,
                            "tangentStart": {
                              "x": -0.03980569896152204,
                              "y": 0.09729293662673087
                            },
                            "tangentEnd": {
                              "x": -0.0009134379274676252,
                              "y": -0.10511695568812983
                            }
                          },
                          {
                            "start": 24,
                            "end": 25,
                            "tangentStart": {
                              "x": 0.0009134379274676252,
                              "y": 0.10511695568812983
                            },
                            "tangentEnd": {
                              "x": -0.041490458050326494,
                              "y": -0.09658649400913326
                            }
                          },
                          {
                            "start": 25,
                            "end": 26,
                            "tangentStart": {
                              "x": 0.041490458050326494,
                              "y": 0.09658649400913326
                            },
                            "tangentEnd": {
                              "x": -0.07561223988417468,
                              "y": -0.07302874521568477
                            }
                          },
                          {
                            "start": 26,
                            "end": 27,
                            "tangentStart": {
                              "x": 0,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 0
                            }
                          },
                          {
                            "start": 27,
                            "end": 4,
                            "tangentStart": {
                              "x": 0,
                              "y": 0
                            },
                            "tangentEnd": {
                              "x": 0,
                              "y": 0
                            }
                          }
                        ],
                        "regions": [
                          {
                            "windingRule": "EVENODD",
                            "loops": [
                              [
                                0,
                                1,
                                2,
                                3
                              ],
                              [
                                4,
                                5,
                                6,
                                7,
                                8,
                                9,
                                10,
                                11,
                                12,
                                13,
                                14,
                                15,
                                16,
                                17,
                                18,
                                19,
                                20,
                                21,
                                22,
                                23,
                                24,
                                25,
                                26,
                                27
                              ]
                            ],
                            "fills": [
                              {
                                "type": "SOLID",
                                "visible": true,
                                "opacity": 1,
                                "blendMode": "NORMAL",
                                "color": {
                                  "r": 1,
                                  "g": 1,
                                  "b": 1,
                                  "a": 1
                                }
                              }
                            ]
                          }
                        ]
                      },
                      "fills": [
                        {
                          "type": "SOLID",
                          "visible": true,
                          "opacity": 1,
                          "blendMode": "NORMAL",
                          "color": {
                            "r": 1,
                            "g": 1,
                            "b": 1,
                            "a": 1
                          }
                        }
                      ],
                      "relativeTransform": [
                        [
                          1,
                          0,
                          1.5833332538604736
                        ],
                        [
                          0,
                          1,
                          1.5833332538604736
                        ]
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        "previewData": "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"
      },
      {
        "title": "Frame 550",
        "width": 179,
        "height": 48,
        "createdAt": "2026-08-09T22:07:57.136Z",
        "nodeData": {
          "type": "FRAME",
          "name": "Frame 550",
          "visible": true,
          "locked": false,
          "opacity": 1,
          "blendMode": "PASS_THROUGH",
          "rotation": 0,
          "x": 658,
          "y": 3874,
          "width": 179,
          "height": 48,
          "isMask": false,
          "maskType": "ALPHA",
          "constraints": {
            "horizontal": "MIN",
            "vertical": "MIN"
          },
          "cornerRadius": 36,
          "topLeftRadius": 36,
          "topRightRadius": 36,
          "bottomRightRadius": 36,
          "bottomLeftRadius": 36,
          "cornerSmoothing": 0,
          "layoutAlign": "INHERIT",
          "layoutGrow": 0,
          "layoutSizingHorizontal": "HUG",
          "layoutSizingVertical": "FIXED",
          "layoutPositioning": "AUTO",
          "fills": [
            {
              "type": "SOLID",
              "visible": true,
              "opacity": 1,
              "blendMode": "NORMAL",
              "color": {
                "r": 0.040855731815099716,
                "g": 0.1462036371231079,
                "b": 0.37728941440582275,
                "a": 1
              }
            }
          ],
          "relativeTransform": [
            [
              1,
              0,
              658
            ],
            [
              0,
              1,
              3874
            ]
          ],
          "layoutMode": "HORIZONTAL",
          "clipsContent": false,
          "itemSpacing": 10,
          "paddingLeft": 24,
          "paddingRight": 24,
          "paddingTop": 0,
          "paddingBottom": 0,
          "counterAxisSpacing": 0,
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "primaryAxisSizingMode": "AUTO",
          "counterAxisSizingMode": "FIXED",
          "children": [
            {
              "type": "TEXT",
              "name": "Our solutions",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 24,
              "y": 18,
              "width": 107,
              "height": 12,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "HUG",
              "layoutSizingVertical": "HUG",
              "layoutPositioning": "AUTO",
              "characters": "Our solutions",
              "fontSize": 16,
              "fontName": {
                "family": "Inter",
                "style": "Bold"
              },
              "textAlignHorizontal": "LEFT",
              "textAlignVertical": "TOP",
              "textAutoResize": "WIDTH_AND_HEIGHT",
              "letterSpacing": {
                "value": 0.5,
                "unit": "PERCENT"
              },
              "lineHeight": {
                "unit": "AUTO"
              },
              "paragraphSpacing": 28,
              "paragraphIndent": 0,
              "textDecoration": "NONE",
              "textCase": "ORIGINAL",
              "leadingTrim": "CAP_HEIGHT",
              "fills": [
                {
                  "type": "SOLID",
                  "visible": true,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 1,
                    "g": 1,
                    "b": 1,
                    "a": 1
                  }
                }
              ],
              "relativeTransform": [
                [
                  1,
                  0,
                  24
                ],
                [
                  0,
                  1,
                  18
                ]
              ]
            },
            {
              "type": "VECTOR",
              "name": "Vector",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 141,
              "y": 18,
              "width": 14,
              "height": 12,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "cornerRadius": 0,
              "cornerSmoothing": 0,
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "FIXED",
              "layoutSizingVertical": "FIXED",
              "layoutPositioning": "AUTO",
              "vectorPaths": [
                {
                  "data": "M 0 6 L 14 6 M 14 6 L 8 0 M 14 6 L 8 12",
                  "windingRule": "NONE"
                }
              ],
              "vectorNetwork": {
                "vertices": [
                  {
                    "x": 0,
                    "y": 6,
                    "strokeCap": "ROUND",
                    "strokeJoin": "ROUND",
                    "cornerRadius": 0,
                    "handleMirroring": "NONE"
                  },
                  {
                    "x": 14,
                    "y": 6,
                    "strokeCap": "ROUND",
                    "strokeJoin": "ROUND",
                    "cornerRadius": 0,
                    "handleMirroring": "NONE"
                  },
                  {
                    "x": 8,
                    "y": 0,
                    "strokeCap": "ROUND",
                    "strokeJoin": "ROUND",
                    "cornerRadius": 0,
                    "handleMirroring": "NONE"
                  },
                  {
                    "x": 8,
                    "y": 12,
                    "strokeCap": "ROUND",
                    "strokeJoin": "ROUND",
                    "cornerRadius": 0,
                    "handleMirroring": "NONE"
                  }
                ],
                "segments": [
                  {
                    "start": 0,
                    "end": 1,
                    "tangentStart": {
                      "x": 0,
                      "y": 0
                    },
                    "tangentEnd": {
                      "x": 0,
                      "y": 0
                    }
                  },
                  {
                    "start": 2,
                    "end": 1,
                    "tangentStart": {
                      "x": 0,
                      "y": 0
                    },
                    "tangentEnd": {
                      "x": 0,
                      "y": 0
                    }
                  },
                  {
                    "start": 1,
                    "end": 3,
                    "tangentStart": {
                      "x": 0,
                      "y": 0
                    },
                    "tangentEnd": {
                      "x": 0,
                      "y": 0
                    }
                  }
                ]
              },
              "relativeTransform": [
                [
                  1,
                  0,
                  141
                ],
                [
                  0,
                  1,
                  18
                ]
              ],
              "strokes": [
                {
                  "type": "SOLID",
                  "visible": true,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 1,
                    "g": 1,
                    "b": 1,
                    "a": 1
                  }
                }
              ],
              "strokeWeight": 2,
              "strokeAlign": "CENTER",
              "strokeCap": "ROUND",
              "strokeJoin": "ROUND"
            }
          ]
        },
        "previewData": "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"
      },
      {
        "title": "Retro rounded corner Button Dark Mode",
        "width": 158,
        "height": 64,
        "createdAt": "2026-08-09T22:07:38.985Z",
        "nodeData": {
          "type": "INSTANCE",
          "name": "Retro rounded corner Button Dark Mode",
          "visible": true,
          "locked": false,
          "opacity": 1,
          "blendMode": "PASS_THROUGH",
          "rotation": 0,
          "x": -2615,
          "y": 4103,
          "width": 158,
          "height": 64,
          "isMask": false,
          "maskType": "ALPHA",
          "constraints": {
            "horizontal": "MIN",
            "vertical": "MIN"
          },
          "cornerRadius": 10,
          "topLeftRadius": 10,
          "topRightRadius": 10,
          "bottomRightRadius": 10,
          "bottomLeftRadius": 10,
          "cornerSmoothing": 0,
          "layoutAlign": "INHERIT",
          "layoutGrow": 0,
          "layoutSizingHorizontal": "HUG",
          "layoutSizingVertical": "HUG",
          "layoutPositioning": "AUTO",
          "fills": [
            {
              "type": "SOLID",
              "visible": true,
              "opacity": 1,
              "blendMode": "NORMAL",
              "color": {
                "r": 1,
                "g": 1,
                "b": 1,
                "a": 1
              }
            }
          ],
          "relativeTransform": [
            [
              1,
              0,
              -2615
            ],
            [
              0,
              1,
              4103
            ]
          ],
          "strokes": [
            {
              "type": "SOLID",
              "visible": true,
              "opacity": 1,
              "blendMode": "NORMAL",
              "color": {
                "r": 0,
                "g": 0,
                "b": 0,
                "a": 1
              }
            }
          ],
          "strokeWeight": 2,
          "strokeAlign": "CENTER",
          "strokeCap": "NONE",
          "strokeJoin": "MITER",
          "effects": [
            {
              "type": "DROP_SHADOW",
              "visible": true,
              "blendMode": "NORMAL",
              "offset": {
                "x": 5,
                "y": 5
              },
              "radius": 0,
              "spread": 0,
              "color": {
                "r": 0,
                "g": 0,
                "b": 0,
                "a": 1
              },
              "showShadowBehindNode": false
            }
          ],
          "layoutMode": "HORIZONTAL",
          "clipsContent": false,
          "itemSpacing": 10,
          "paddingLeft": 35,
          "paddingRight": 35,
          "paddingTop": 15,
          "paddingBottom": 15,
          "counterAxisSpacing": 0,
          "primaryAxisAlignItems": "CENTER",
          "counterAxisAlignItems": "CENTER",
          "primaryAxisSizingMode": "AUTO",
          "counterAxisSizingMode": "AUTO",
          "children": [
            {
              "type": "TEXT",
              "name": "Button",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 35,
              "y": 15,
              "width": 88,
              "height": 34,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "HUG",
              "layoutSizingVertical": "HUG",
              "layoutPositioning": "AUTO",
              "characters": "Button",
              "fontSize": 28,
              "fontName": {
                "family": "Inter",
                "style": "Regular"
              },
              "textAlignHorizontal": "CENTER",
              "textAlignVertical": "CENTER",
              "textAutoResize": "WIDTH_AND_HEIGHT",
              "letterSpacing": {
                "value": 0,
                "unit": "PERCENT"
              },
              "lineHeight": {
                "unit": "AUTO"
              },
              "paragraphSpacing": 0,
              "paragraphIndent": 0,
              "textDecoration": "NONE",
              "textCase": "ORIGINAL",
              "leadingTrim": "NONE",
              "fills": [
                {
                  "type": "SOLID",
                  "visible": true,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 0,
                    "g": 0,
                    "b": 0,
                    "a": 1
                  }
                }
              ],
              "relativeTransform": [
                [
                  1,
                  0,
                  35
                ],
                [
                  0,
                  1,
                  15
                ]
              ]
            }
          ]
        },
        "previewData": "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"
      }
    ]
  },
  {
    "name": "Drop Shadow",
    "styles": [
      {
        "title": "Drop2",
        "width": 150,
        "height": 70,
        "createdAt": "2026-08-09T21:15:35.423Z",
        "nodeData": {
          "type": "FRAME",
          "name": "Drop2",
          "visible": true,
          "locked": false,
          "opacity": 1,
          "blendMode": "PASS_THROUGH",
          "rotation": 0,
          "x": -3574,
          "y": 4157,
          "width": 150,
          "height": 70,
          "isMask": false,
          "maskType": "ALPHA",
          "constraints": {
            "horizontal": "MIN",
            "vertical": "MIN"
          },
          "cornerRadius": 0,
          "topLeftRadius": 0,
          "topRightRadius": 0,
          "bottomRightRadius": 0,
          "bottomLeftRadius": 0,
          "cornerSmoothing": 0,
          "layoutAlign": "INHERIT",
          "layoutGrow": 0,
          "layoutSizingHorizontal": "HUG",
          "layoutSizingVertical": "FIXED",
          "layoutPositioning": "AUTO",
          "relativeTransform": [
            [
              1,
              0,
              -3574
            ],
            [
              0,
              1,
              4157
            ]
          ],
          "layoutMode": "VERTICAL",
          "clipsContent": false,
          "itemSpacing": 15,
          "paddingLeft": 0,
          "paddingRight": 0,
          "paddingTop": 0,
          "paddingBottom": 0,
          "counterAxisSpacing": 0,
          "primaryAxisAlignItems": "MIN",
          "counterAxisAlignItems": "MIN",
          "primaryAxisSizingMode": "FIXED",
          "counterAxisSizingMode": "AUTO",
          "children": [
            {
              "type": "RECTANGLE",
              "name": "Rectangle",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 0,
              "y": 0,
              "width": 150,
              "height": 70,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "cornerRadius": 16,
              "topLeftRadius": 16,
              "topRightRadius": 16,
              "bottomRightRadius": 16,
              "bottomLeftRadius": 16,
              "cornerSmoothing": 0,
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "FIXED",
              "layoutSizingVertical": "FIXED",
              "layoutPositioning": "AUTO",
              "fills": [
                {
                  "type": "SOLID",
                  "visible": true,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 0.9529411792755127,
                    "g": 0.95686274766922,
                    "b": 0.9647058844566345,
                    "a": 1
                  }
                }
              ],
              "relativeTransform": [
                [
                  1,
                  0,
                  0
                ],
                [
                  0,
                  1,
                  0
                ]
              ],
              "effects": [
                {
                  "type": "DROP_SHADOW",
                  "visible": true,
                  "blendMode": "NORMAL",
                  "offset": {
                    "x": 0,
                    "y": 25
                  },
                  "radius": 50,
                  "spread": -12,
                  "color": {
                    "r": 0,
                    "g": 0,
                    "b": 0,
                    "a": 0.25
                  },
                  "showShadowBehindNode": false
                }
              ]
            }
          ]
        },
        "previewData": "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"
      },
      {
        "title": "Drop1",
        "width": 150,
        "height": 70,
        "createdAt": "2026-08-09T21:15:32.004Z",
        "nodeData": {
          "type": "FRAME",
          "name": "Drop1",
          "visible": true,
          "locked": false,
          "opacity": 1,
          "blendMode": "PASS_THROUGH",
          "rotation": 0,
          "x": -3738,
          "y": 4157,
          "width": 150,
          "height": 70,
          "isMask": false,
          "maskType": "ALPHA",
          "constraints": {
            "horizontal": "MIN",
            "vertical": "MIN"
          },
          "cornerRadius": 0,
          "topLeftRadius": 0,
          "topRightRadius": 0,
          "bottomRightRadius": 0,
          "bottomLeftRadius": 0,
          "cornerSmoothing": 0,
          "layoutAlign": "INHERIT",
          "layoutGrow": 0,
          "layoutSizingHorizontal": "HUG",
          "layoutSizingVertical": "FIXED",
          "layoutPositioning": "AUTO",
          "relativeTransform": [
            [
              1,
              0,
              -3738
            ],
            [
              0,
              1,
              4157
            ]
          ],
          "layoutMode": "VERTICAL",
          "clipsContent": false,
          "itemSpacing": 15,
          "paddingLeft": 0,
          "paddingRight": 0,
          "paddingTop": 0,
          "paddingBottom": 0,
          "counterAxisSpacing": 0,
          "primaryAxisAlignItems": "MIN",
          "counterAxisAlignItems": "MIN",
          "primaryAxisSizingMode": "FIXED",
          "counterAxisSizingMode": "AUTO",
          "children": [
            {
              "type": "RECTANGLE",
              "name": "Rectangle",
              "visible": true,
              "locked": false,
              "opacity": 1,
              "blendMode": "PASS_THROUGH",
              "rotation": 0,
              "x": 0,
              "y": 0,
              "width": 150,
              "height": 70,
              "isMask": false,
              "maskType": "ALPHA",
              "constraints": {
                "horizontal": "MIN",
                "vertical": "MIN"
              },
              "cornerRadius": 16,
              "topLeftRadius": 16,
              "topRightRadius": 16,
              "bottomRightRadius": 16,
              "bottomLeftRadius": 16,
              "cornerSmoothing": 0,
              "layoutAlign": "INHERIT",
              "layoutGrow": 0,
              "layoutSizingHorizontal": "FIXED",
              "layoutSizingVertical": "FIXED",
              "layoutPositioning": "AUTO",
              "fills": [
                {
                  "type": "SOLID",
                  "visible": true,
                  "opacity": 1,
                  "blendMode": "NORMAL",
                  "color": {
                    "r": 0.9529411792755127,
                    "g": 0.95686274766922,
                    "b": 0.9647058844566345,
                    "a": 1
                  }
                }
              ],
              "relativeTransform": [
                [
                  1,
                  0,
                  0
                ],
                [
                  0,
                  1,
                  0
                ]
              ],
              "effects": [
                {
                  "type": "DROP_SHADOW",
                  "visible": true,
                  "blendMode": "NORMAL",
                  "offset": {
                    "x": 0,
                    "y": 8
                  },
                  "radius": 10,
                  "spread": -6,
                  "color": {
                    "r": 0,
                    "g": 0,
                    "b": 0,
                    "a": 0.10000000149011612
                  },
                  "showShadowBehindNode": false
                },
                {
                  "type": "DROP_SHADOW",
                  "visible": true,
                  "blendMode": "NORMAL",
                  "offset": {
                    "x": 0,
                    "y": 20
                  },
                  "radius": 25,
                  "spread": -5,
                  "color": {
                    "r": 0,
                    "g": 0,
                    "b": 0,
                    "a": 0.10000000149011612
                  },
                  "showShadowBehindNode": false
                }
              ]
            }
          ]
        },
        "previewData": "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"
      }
    ]
  }
];

function getInitializedKeyForUser(user) {
  if (!user || !user.uid) return 'assets-diary-initialized-guest';
  return `assets-diary-initialized-${user.uid}`;
}

function cloneStarterFolders(folders) {
  if (!Array.isArray(folders)) return [];
  return folders.map((f, fIdx) => {
    const newFolderId = `folder-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 7)}`;
    const clonedStyles = (f.styles || []).map((s, sIdx) => ({
      ...s,
      styleId: `style-${Date.now()}-${fIdx}-${sIdx}-${Math.random().toString(36).substring(2, 7)}`
    }));
    return {
      ...f,
      folderId: newFolderId,
      styles: clonedStyles
    };
  });
}

function sanitizeFolders(folders) {
  if (!Array.isArray(folders)) return [];
  return folders.filter(f => f && typeof f === 'object').map((f, idx) => ({
    folderId: f.folderId || `folder-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    name: f.name || 'Untitled Collection',
    styles: Array.isArray(f.styles) ? f.styles.filter(s => s && typeof s === 'object').map((s, sIdx) => ({
      ...s,
      styleId: s.styleId || `style-${Date.now()}-${idx}-${sIdx}-${Math.random().toString(36).substring(2, 6)}`,
      title: s.title || 'Untitled Frame'
    })) : []
  }));
}

function mergeFolders(memoryFolders, storageFolders) {
  if (!Array.isArray(memoryFolders) || memoryFolders.length === 0) return storageFolders || [];
  if (!Array.isArray(storageFolders) || storageFolders.length === 0) return memoryFolders || [];

  const folderMap = new Map();

  // First populate storage folders
  storageFolders.forEach(f => {
    if (f && f.folderId) {
      folderMap.set(f.folderId, {
        ...f,
        styles: Array.isArray(f.styles) ? [...f.styles] : []
      });
    }
  });

  // Merge in memory folders (memory styles take precedence for newly added items)
  memoryFolders.forEach(mf => {
    if (!mf || !mf.folderId) return;
    const existing = folderMap.get(mf.folderId);
    if (!existing) {
      folderMap.set(mf.folderId, { ...mf, styles: Array.isArray(mf.styles) ? [...mf.styles] : [] });
    } else {
      const styleMap = new Map();
      (existing.styles || []).forEach(s => { if (s && s.styleId) styleMap.set(s.styleId, s); });
      (mf.styles || []).forEach(s => { if (s && s.styleId) styleMap.set(s.styleId, s); });
      existing.name = mf.name || existing.name;
      existing.styles = Array.from(styleMap.values());
    }
  });

  return Array.from(folderMap.values());
}

async function saveStarterTemplate(folders) {
  try {
    const templateToSave = folders || footerFolders;
    if (Array.isArray(templateToSave) && templateToSave.length > 0) {
      const cleanTemplate = JSON.parse(JSON.stringify(templateToSave));
      await figma.clientStorage.setAsync(STARTER_TEMPLATE_STORAGE_KEY, cleanTemplate);
    }
  } catch (e) {}
}

async function saveLocalFolders() {
  try {
    const key = getStorageKeyForUser(currentUser);
    const backupKey = `${key}-backup`;
    const cleanData = JSON.parse(JSON.stringify(footerFolders));
    await figma.clientStorage.setAsync(key, cleanData);
    await figma.clientStorage.setAsync(backupKey, cleanData);
    try {
      figma.root.setPluginData('assets-diary-document-backup', JSON.stringify(cleanData));
    } catch (e) {}
  } catch (e) {}
  scheduleDriveIndexSave();
}

async function loadLocalFolders() {
  const key = getStorageKeyForUser(currentUser);
  const backupKey = `${key}-backup`;
  const snapshotKey = `${key}-snapshot`;
  const initializedKey = getInitializedKeyForUser(currentUser);

  let stored = null;
  let isInitialized = false;

  try {
    stored = await figma.clientStorage.getAsync(key);
    if (!Array.isArray(stored) || stored.length === 0) {
      stored = await figma.clientStorage.getAsync(backupKey);
    }
    if (!Array.isArray(stored) || stored.length === 0) {
      stored = await figma.clientStorage.getAsync(snapshotKey);
    }
    // Check document-level pluginData fallback
    try {
      const docDataStr = figma.root.getPluginData('assets-diary-document-backup');
      if (docDataStr) {
        const parsedDoc = JSON.parse(docDataStr);
        if (Array.isArray(parsedDoc) && parsedDoc.length > 0) {
          if (Array.isArray(stored) && stored.length > 0) {
            stored = mergeFolders(stored, parsedDoc);
          } else {
            stored = parsedDoc;
          }
        }
      }
    } catch (e) {}
    // Check legacy storage keys to prevent data loss for upgraded users
    if (!Array.isArray(stored) || stored.length === 0) {
      const legacyLocal = await figma.clientStorage.getAsync(LOCAL_FOLDERS_STORAGE_KEY);
      if (Array.isArray(legacyLocal) && legacyLocal.length > 0) {
        stored = legacyLocal;
      } else {
        const legacyGuest = await figma.clientStorage.getAsync('assets-diary-folders-guest');
        if (Array.isArray(legacyGuest) && legacyGuest.length > 0) {
          stored = legacyGuest;
        } else {
          const legacyBase = await figma.clientStorage.getAsync('assets-diary-folders');
          if (Array.isArray(legacyBase) && legacyBase.length > 0) {
            stored = legacyBase;
          }
        }
      }
    }
    isInitialized = await figma.clientStorage.getAsync(initializedKey);
  } catch (e) {}

  if (Array.isArray(stored) && stored.length > 0) {
    const sanitized = sanitizeFolders(stored);
    sanitized.forEach(f => {
      const match = DEFAULT_EXAMPLE_COLLECTIONS.find(def => def.name.toLowerCase() === f.name.toLowerCase() || f.name.toLowerCase().includes(def.name.toLowerCase()));
      if (match && (!Array.isArray(f.styles) || f.styles.length === 0)) {
        f.styles = cloneStarterFolders([match])[0].styles;
      }
    });
    if (Array.isArray(footerFolders) && footerFolders.length > 0) {
      footerFolders = mergeFolders(footerFolders, sanitized);
    } else {
      footerFolders = sanitized;
    }
  } else if (isInitialized) {
    if (!Array.isArray(footerFolders) || footerFolders.length === 0) {
      footerFolders = Array.isArray(stored) ? sanitizeFolders(stored) : [];
    }
  } else {
    // Brand new user launching the plugin for the first time!
    let starterTemplate = null;
    try {
      starterTemplate = await figma.clientStorage.getAsync(STARTER_TEMPLATE_STORAGE_KEY);
    } catch (e) {}

    if (Array.isArray(starterTemplate) && starterTemplate.length > 0) {
      footerFolders = cloneStarterFolders(starterTemplate);
    } else {
      footerFolders = cloneStarterFolders(DEFAULT_EXAMPLE_COLLECTIONS);
    }

    try {
      await figma.clientStorage.setAsync(initializedKey, true);
      await figma.clientStorage.setAsync(key, footerFolders);
      await figma.clientStorage.setAsync(backupKey, footerFolders);
    } catch (e) {}
  }

  processPendingUploadQueue().catch(() => {});
}

async function enqueuePendingUpload(styleItem) {
  try {
    const queueKey = getPendingUploadsKeyForUser(currentUser);
    const queue = (await figma.clientStorage.getAsync(queueKey)) || [];
    if (!queue.some(item => item.styleId === styleItem.styleId)) {
      queue.push({
        styleId: styleItem.styleId,
        folderId: driveConfig.folderId,
        nodeData: styleItem.nodeData,
        previewData: styleItem.previewData,
        timestamp: Date.now()
      });
      await figma.clientStorage.setAsync(queueKey, queue);
    }
    processPendingUploadQueue().catch(() => {});
  } catch (e) {}
}

async function processPendingUploadQueue() {
  if (isProcessingQueue) return;
  if (!driveConfig.token && !driveConfig.refreshToken) return;

  try {
    isProcessingQueue = true;
    const queueKey = getPendingUploadsKeyForUser(currentUser);
    let queue = (await figma.clientStorage.getAsync(queueKey)) || [];
    if (!Array.isArray(queue) || queue.length === 0) {
      isProcessingQueue = false;
      return;
    }

    await ensureDriveAccessToken();

    const remainingQueue = [];

    for (const item of queue) {
      try {
        const nodeDataJson = JSON.stringify(item.nodeData || {});
        const nodeDataBytes = stringToUint8Array(nodeDataJson);
        const pngBytes = item.previewData ? decodeBase64(item.previewData) : new Uint8Array(0);

        let driveNodeFileId = null;
        let drivePngFileId = null;
        let driveSvgFileId = null;

        const uploads = [
          driveUploadFile(item.styleId + '.json', 'application/json', nodeDataBytes, item.folderId || driveConfig.folderId).then(id => driveNodeFileId = id)
        ];
        if (pngBytes && pngBytes.length > 0) {
          uploads.push(driveUploadFile(item.styleId + '.png', 'image/png', pngBytes, item.folderId || driveConfig.folderId).then(id => drivePngFileId = id));
        }

        if (item.nodeData && item.nodeData.svgMarkup) {
          const svgBytes = stringToUint8Array(item.nodeData.svgMarkup);
          uploads.push(driveUploadFile(item.styleId + '.svg', 'image/svg+xml', svgBytes, item.folderId || driveConfig.folderId).then(id => driveSvgFileId = id).catch(() => {}));
        }

        await Promise.all(uploads);

        for (const f of footerFolders) {
          if (f.styles) {
            const s = f.styles.find(st => st.styleId === item.styleId);
            if (s) {
              if (driveNodeFileId) s.driveNodeFileId = driveNodeFileId;
              if (drivePngFileId) s.drivePngFileId = drivePngFileId;
              if (driveSvgFileId) s.driveSvgFileId = driveSvgFileId;
            }
          }
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    await figma.clientStorage.setAsync(queueKey, remainingQueue);
    await saveLocalFolders();

    if (queue.length > remainingQueue.length) {
      scheduleDriveIndexSave();
    }
  } catch (e) {
  } finally {
    isProcessingQueue = false;
  }
}


// Key used to store a small sample of SVG import failures for debugging
const SVG_IMPORT_FAILURES_KEY = 'svg-import-failures';

async function recordSvgFailure(svgMarkup, reason) {
  try {
    const existing = (await figma.clientStorage.getAsync(SVG_IMPORT_FAILURES_KEY)) || [];
    existing.push({ svg: typeof svgMarkup === 'string' ? svgMarkup : String(svgMarkup), reason: reason || '', date: new Date().toISOString() });
    // Keep only the most recent 20 failures to avoid unbounded storage
    if (existing.length > 20) existing.splice(0, existing.length - 20);
    await figma.clientStorage.setAsync(SVG_IMPORT_FAILURES_KEY, existing);
    // Notify the UI so the user can inspect failures quickly
    try { safePostMessage({ type: 'svg-import-failure', reason: reason || '', sample: (svgMarkup || '').slice(0, 1024) }); } catch (e) {}
  } catch (e) {}
}

function clearSvgNodeStrokes(node) {
  if (!node) return;
  try {
    const fills = node.fills;
    const hasVisibleFill = Array.isArray(fills) && fills.some(f => f.visible !== false && f.type !== 'IMAGE');
    if (hasVisibleFill) {
      if (node.strokes !== undefined) node.strokes = [];
      if (node.strokeWeight !== undefined) node.strokeWeight = 0;
    }
  } catch (e) {}
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      clearSvgNodeStrokes(child);
    }
  }
}
async function saveDriveSettings() {
  const stored = {
    driveConfig: {
      folderId: driveConfig.folderId,
      token: (driveConfig.rememberDriveSettings && driveConfig.rememberToken !== false) ? driveConfig.token : null,
      refreshToken: (driveConfig.rememberDriveSettings && driveConfig.rememberRefreshToken !== false) ? driveConfig.refreshToken : null,
      clientId: (driveConfig.rememberDriveSettings && driveConfig.rememberClientId !== false) ? driveConfig.clientId : null,
      clientSecret: (driveConfig.rememberDriveSettings && driveConfig.rememberClientSecret !== false) ? driveConfig.clientSecret : null,
      tokenExpiresAt: driveConfig.rememberDriveSettings ? driveConfig.tokenExpiresAt : null,
      rememberDriveSettings: driveConfig.rememberDriveSettings,
      rememberToken: driveConfig.rememberToken,
      rememberRefreshToken: driveConfig.rememberRefreshToken,
      rememberClientId: driveConfig.rememberClientId,
      rememberClientSecret: driveConfig.rememberClientSecret,
      indexFileId: driveConfig.indexFileId || null,
      userEmail: driveConfig.userEmail || null
    }
  };
  await figma.clientStorage.setAsync(DRIVE_SETTINGS_STORAGE_KEY, stored);
}

function getFolderById(folderId) {
  return footerFolders.find(f => f.folderId === folderId);
}

function getStyle(folderId, styleId) {
  if (folderId) {
    const folder = getFolderById(folderId);
    if (folder && folder.styles) {
      const match = folder.styles.find(s => s.styleId === styleId);
      if (match) return match;
    }
  }
  // Fallback: search across all folders globally if folderId is mismatched or missing
  if (Array.isArray(footerFolders)) {
    for (const folder of footerFolders) {
      if (folder && folder.styles) {
        const match = folder.styles.find(s => s.styleId === styleId);
        if (match) return match;
      }
    }
  }
  return null;
}

function getSelectedFrameInfo() {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) return null;
  const node = selection[0];
  if (!node || typeof node.exportAsync !== 'function') return null;
  return {
    name: node.name || 'Selected Element',
    width: node.width || 0,
    height: node.height || 0,
    nodeId: node.id,
    type: node.type
  };
}

function safePostMessage(msg) {
  try {
    if (!msg) return;
    figma.ui.postMessage(msg);
  } catch (err) {
    try {
      const cleanMsg = JSON.parse(JSON.stringify(msg, (key, value) => {
        if (typeof value === 'symbol' || (value && typeof value === 'object' && typeof value.exportAsync === 'function')) {
          return undefined;
        }
        return value;
      }));
      figma.ui.postMessage(cleanMsg);
    } catch (e) {}
  }
}

function getSelectedFramesInfo() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return [];
  const frames = [];
  for (const node of selection) {
    if (node && typeof node.exportAsync === 'function') {
      frames.push({
        name: node.name || 'Selected Element',
        width: node.width || 0,
        height: node.height || 0,
        nodeId: node.id,
        type: node.type
      });
    }
  }
  return frames;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes) {
  if (!bytes || bytes.length === 0) return null;
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (b2 >> 4);
    let enc3 = ((b2 & 15) << 2) | (b3 >> 6);
    let enc4 = b3 & 63;

    if (i + 1 >= len) {
      enc3 = 64;
      enc4 = 64;
    } else if (i + 2 >= len) {
      enc4 = 64;
    }

    base64 += BASE64_CHARS.charAt(enc1) +
              BASE64_CHARS.charAt(enc2) +
              (enc3 === 64 ? '=' : BASE64_CHARS.charAt(enc3)) +
              (enc4 === 64 ? '=' : BASE64_CHARS.charAt(enc4));
  }
  return base64;
}

function base64ToUint8Array(base64) {
  if (!base64 || typeof base64 !== 'string') return new Uint8Array(0);
  const cleanB64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = cleanB64.length;
  if (len === 0) return new Uint8Array(0);

  const lookup = new Uint8Array(256);
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }

  const placeHolders = base64.charAt(base64.length - 2) === '=' ? 2 : (base64.charAt(base64.length - 1) === '=' ? 1 : 0);
  const arrLen = Math.max(0, Math.floor(len * 3 / 4) - placeHolders);
  const bytes = new Uint8Array(arrLen);

  let cur = 0;
  for (let i = 0; i < len && cur < arrLen; i += 4) {
    const e1 = lookup[cleanB64.charCodeAt(i)];
    const e2 = lookup[cleanB64.charCodeAt(i + 1)];
    const e3 = lookup[cleanB64.charCodeAt(i + 2)];
    const e4 = lookup[cleanB64.charCodeAt(i + 3)];

    bytes[cur++] = (e1 << 2) | (e2 >> 4);
    if (cur < arrLen) bytes[cur++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (cur < arrLen) bytes[cur++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}

async function serializePaint(p) {
  if (!p || !p.type) return null;
  const paint = {
    type: p.type,
    visible: p.visible !== false,
    opacity: p.opacity !== undefined ? p.opacity : 1,
    blendMode: p.blendMode || 'NORMAL'
  };

  if (p.type === 'SOLID') {
    if (p.color) {
      paint.color = {
        r: p.color.r !== undefined ? p.color.r : 0,
        g: p.color.g !== undefined ? p.color.g : 0,
        b: p.color.b !== undefined ? p.color.b : 0,
        a: p.color.a !== undefined ? p.color.a : 1
      };
    }
  } else if (['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'].includes(p.type)) {
    if (p.gradientStops && Array.isArray(p.gradientStops)) {
      paint.gradientStops = p.gradientStops.map(stop => ({
        position: stop.position !== undefined ? stop.position : 0,
        color: {
          r: (stop.color && stop.color.r !== undefined) ? stop.color.r : 0,
          g: (stop.color && stop.color.g !== undefined) ? stop.color.g : 0,
          b: (stop.color && stop.color.b !== undefined) ? stop.color.b : 0,
          a: (stop.color && stop.color.a !== undefined) ? stop.color.a : 1
        }
      }));
    }
    if (p.gradientTransform && Array.isArray(p.gradientTransform)) {
      paint.gradientTransform = JSON.parse(JSON.stringify(p.gradientTransform));
    }
  } else if (p.type === 'IMAGE') {
    // Skip IMAGE fills completely as requested by user to eliminate image encoding overhead and storage bloat
    return null;
  }

  return paint;
}

function deserializePaint(p) {
  if (!p || !p.type) return null;
  // Ignore invisible or 0% opacity paints so hidden fills/strokes don't render as solid shapes
  if (p.visible === false || (p.opacity !== undefined && p.opacity <= 0)) {
    return null;
  }
  const paint = {
    type: p.type,
    visible: true,
    opacity: p.opacity !== undefined ? p.opacity : 1,
    blendMode: p.blendMode || 'NORMAL'
  };

  if (p.type === 'SOLID') {
    paint.color = {
      r: (p.color && p.color.r !== undefined) ? p.color.r : 0,
      g: (p.color && p.color.g !== undefined) ? p.color.g : 0,
      b: (p.color && p.color.b !== undefined) ? p.color.b : 0,
      a: (p.color && p.color.a !== undefined) ? p.color.a : 1
    };
  } else if (['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'].includes(p.type)) {
    if (p.gradientStops && Array.isArray(p.gradientStops) && p.gradientStops.length > 0) {
      paint.gradientStops = p.gradientStops.map(stop => ({
        position: stop.position !== undefined ? stop.position : 0,
        color: {
          r: (stop.color && stop.color.r !== undefined) ? stop.color.r : 0,
          g: (stop.color && stop.color.g !== undefined) ? stop.color.g : 0,
          b: (stop.color && stop.color.b !== undefined) ? stop.color.b : 0,
          a: (stop.color && stop.color.a !== undefined) ? stop.color.a : 1
        }
      }));
    }
    if (p.gradientTransform && Array.isArray(p.gradientTransform)) {
      paint.gradientTransform = p.gradientTransform;
    }
  } else if (p.type === 'IMAGE') {
    paint.scaleMode = p.scaleMode || 'FILL';
    if (p.imageTransform && Array.isArray(p.imageTransform)) {
      paint.imageTransform = p.imageTransform;
    }
    if (p.scalingFactor !== undefined) paint.scalingFactor = p.scalingFactor;
    if (p.rotation !== undefined) paint.rotation = p.rotation;

    // Restore Image using Figma's figma.createImage() API
    if (p.imageDataBase64) {
      try {
        const bytes = base64ToUint8Array(p.imageDataBase64);
        if (bytes && bytes.length > 0) {
          const image = figma.createImage(bytes);
          paint.imageHash = image.hash;
        }
      } catch (e) {}
    }
  }

  return paint;
}

function serializeEffect(e) {
  if (!e || !e.type) return null;

  if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
    return {
      type: e.type,
      visible: e.visible !== false,
      radius: e.radius !== undefined ? e.radius : 0
    };
  }

  if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
    const shadow = {
      type: e.type,
      visible: e.visible !== false,
      blendMode: e.blendMode || 'NORMAL',
      offset: e.offset ? { x: e.offset.x || 0, y: e.offset.y || 0 } : { x: 0, y: 0 },
      radius: e.radius !== undefined ? e.radius : 0,
      spread: e.spread !== undefined ? e.spread : 0,
      color: e.color ? {
        r: e.color.r !== undefined ? e.color.r : 0,
        g: e.color.g !== undefined ? e.color.g : 0,
        b: e.color.b !== undefined ? e.color.b : 0,
        a: e.color.a !== undefined ? e.color.a : 1
      } : { r: 0, g: 0, b: 0, a: 0.25 }
    };
    if (e.showShadowBehindNode !== undefined) {
      shadow.showShadowBehindNode = e.showShadowBehindNode;
    }
    return shadow;
  }

  return null;
}

function deserializeEffect(e) {
  if (!e || !e.type) return null;

  if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
    return {
      type: e.type,
      visible: e.visible !== false,
      radius: e.radius !== undefined ? e.radius : 0
    };
  }

  if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
    const shadow = {
      type: e.type,
      visible: e.visible !== false,
      blendMode: e.blendMode || 'NORMAL',
      offset: e.offset ? { x: e.offset.x || 0, y: e.offset.y || 0 } : { x: 0, y: 0 },
      radius: e.radius !== undefined ? e.radius : 0,
      spread: e.spread !== undefined ? e.spread : 0,
      color: e.color ? {
        r: e.color.r !== undefined ? e.color.r : 0,
        g: e.color.g !== undefined ? e.color.g : 0,
        b: e.color.b !== undefined ? e.color.b : 0,
        a: e.color.a !== undefined ? e.color.a : 1
      } : { r: 0, g: 0, b: 0, a: 0.25 }
    };
    if (e.showShadowBehindNode !== undefined) {
      shadow.showShadowBehindNode = e.showShadowBehindNode;
    }
    return shadow;
  }

  return null;
}

// Check if a node has any image fill at all
function hasAnyImageFill(node) {
  if (!node) return false;
  try {
    const fills = node.fills;
    if (fills && typeof fills !== 'symbol' && Array.isArray(fills)) {
      return fills.some(f => f && f.type === 'IMAGE');
    }
  } catch (e) {}
  return false;
}

function stripImageFills(node) {
  if (!node) return;
  try {
    const fills = node.fills;
    if (fills && typeof fills !== 'symbol' && Array.isArray(fills) && fills.length > 0) {
      const cleaned = fills.filter(f => !f || f.type !== 'IMAGE');
      if (cleaned.length !== fills.length) {
        node.fills = cleaned;
      }
    }
  } catch (e) {}
}

// Aggressively remove ALL image content from a Figma node tree
function removeImageNodesFromTree(node) {
  if (!node) return;
  // Process children in reverse for safe removal
  if (node.children && node.children.length > 0) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (!child) continue;
      // First recurse into grandchildren so we clean bottom-up
      removeImageNodesFromTree(child);
      // After recursion: if this child is non-TEXT and has image fills, handle it
      if (child.type !== 'TEXT' && hasAnyImageFill(child)) {
        const hasKids = child.children && child.children.length > 0;
        if (!hasKids) {
          // Leaf with image fill: remove the entire node
          try { child.remove(); } catch (e) {}
        } else {
          // Container with image fill: strip just the image fills, keep children
          stripImageFills(child);
        }
      }
    }
  }
  // Strip image fills from the root node itself
  stripImageFills(node);
}

// Serialize entire node tree to JSON for faithful restoration
async function serializeNode(node, depth = 0) {
  if (depth > 50) return null; // Prevent infinite recursion
  
  // Skip any node with image fills during serialization (safety net)
  if (depth > 0 && node.type !== 'TEXT' && hasAnyImageFill(node)) {
    const hasKids = node.children && node.children.length > 0;
    if (!hasKids) return null;
  }
  
  const data = {
    type: node.type,
    name: node.name,
    visible: node.visible,
    locked: node.locked,
    opacity: node.opacity,
    blendMode: node.blendMode,
    rotation: node.rotation,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };

  // Preserve mask layer properties
  if (node.isMask !== undefined) data.isMask = node.isMask;
  if (node.maskType !== undefined) data.maskType = node.maskType;

  // Preserve layout constraints (horizontal/vertical) for ALL node types
  if (node.constraints) {
    data.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical
    };
  }

  // Preserve rounded corners (uniform and mixed 4-corner radii + smoothing) for all node types
  if (typeof node.cornerRadius === 'number') {
    data.cornerRadius = node.cornerRadius;
  }
  if (typeof node.topLeftRadius === 'number') {
    data.topLeftRadius = node.topLeftRadius;
  }
  if (typeof node.topRightRadius === 'number') {
    data.topRightRadius = node.topRightRadius;
  }
  if (typeof node.bottomRightRadius === 'number') {
    data.bottomRightRadius = node.bottomRightRadius;
  }
  if (typeof node.bottomLeftRadius === 'number') {
    data.bottomLeftRadius = node.bottomLeftRadius;
  }
  if (typeof node.cornerSmoothing === 'number') {
    data.cornerSmoothing = node.cornerSmoothing;
  }

  // Preserve polygon/star geometry for fallback recreation
  if (node.type === 'STAR' || node.type === 'POLYGON') {
    data.pointCount = node.pointCount;
  }
  if (node.type === 'STAR') {
    data.innerRadius = node.innerRadius;
    data.outerRadius = node.outerRadius;
  }

  // Preserve Auto Layout child positioning & sizing properties for ALL node types
  if (node.layoutAlign !== undefined) data.layoutAlign = node.layoutAlign;
  if (node.layoutGrow !== undefined) data.layoutGrow = node.layoutGrow;
  if (node.layoutSizingHorizontal !== undefined) data.layoutSizingHorizontal = node.layoutSizingHorizontal;
  if (node.layoutSizingVertical !== undefined) data.layoutSizingVertical = node.layoutSizingVertical;
  if (node.layoutPositioning !== undefined) data.layoutPositioning = node.layoutPositioning;

  // Text node properties
  if (node.type === 'TEXT') {
    data.characters = node.characters;
    data.fontSize = node.fontSize;
    data.fontName = node.fontName ? { family: node.fontName.family, style: node.fontName.style } : null;
    data.textAlignHorizontal = node.textAlignHorizontal;
    data.textAlignVertical = node.textAlignVertical;
    data.textAutoResize = node.textAutoResize;
    data.letterSpacing = node.letterSpacing ? { value: node.letterSpacing.value, unit: node.letterSpacing.unit } : null;
    data.lineHeight = node.lineHeight ? { value: node.lineHeight.value, unit: node.lineHeight.unit } : null;
    data.paragraphSpacing = node.paragraphSpacing;
    data.paragraphIndent = node.paragraphIndent;
    data.textDecoration = node.textDecoration;
    data.textTransform = node.textTransform;
    data.textCase = node.textCase;
    if (node.leadingTrim !== undefined) data.leadingTrim = node.leadingTrim;
    data.constraints = node.constraints ? {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical
    } : null;
  }

  // Preserve SVG/vector geometry ONLY for BOOLEAN_OPERATION or nodes lacking native vectorNetwork (avoids slow exportAsync overhead)
  const vectorLeafTypes = ['VECTOR', 'STAR', 'POLYGON', 'ELLIPSE', 'BOOLEAN_OPERATION', 'LINE'];
  const needsSvgExport = node.type === 'BOOLEAN_OPERATION' || (vectorLeafTypes.includes(node.type) && (!node.vectorNetwork || !node.vectorNetwork.vertices || node.vectorNetwork.vertices.length === 0));
  if (needsSvgExport && typeof node.exportAsync === 'function') {
    try {
      const svgBytes = await node.exportAsync({ format: 'SVG', svgOutlineText: false });
      data.svgMarkup = new TextDecoder().decode(svgBytes);
    } catch (e) {}
  }

  // Preserve native vector-path and vector-network data for vector shapes
  if (node.vectorPaths && node.vectorPaths.length > 0) {
    try {
      const paths = [];
      for (let i = 0; i < node.vectorPaths.length; i++) {
        const vp = node.vectorPaths[i];
        if (vp && vp.data) {
          paths.push({
            data: vp.data,
            windingRule: vp.windingRule || 'NONZERO'
          });
        }
      }
      if (paths.length > 0) data.vectorPaths = paths;
    } catch (e) {}
  }
  // Serialize vectorNetwork explicitly to avoid issues with native proxy objects
  if (node.vectorNetwork) {
    try {
      const vn = node.vectorNetwork;
      const network = {};

      // Extract vertices
      if (vn.vertices && vn.vertices.length > 0) {
        network.vertices = [];
        for (let i = 0; i < vn.vertices.length; i++) {
          const v = vn.vertices[i];
          const vertex = { x: v.x, y: v.y };
          if (v.strokeCap) vertex.strokeCap = v.strokeCap;
          if (v.strokeJoin) vertex.strokeJoin = v.strokeJoin;
          if (v.cornerRadius !== undefined) vertex.cornerRadius = v.cornerRadius;
          if (v.handleMirroring) vertex.handleMirroring = v.handleMirroring;
          network.vertices.push(vertex);
        }
      }

      // Extract segments
      if (vn.segments && vn.segments.length > 0) {
        network.segments = [];
        for (let i = 0; i < vn.segments.length; i++) {
          const s = vn.segments[i];
          const seg = { start: s.start, end: s.end };
          if (s.tangentStart) seg.tangentStart = { x: s.tangentStart.x, y: s.tangentStart.y };
          if (s.tangentEnd) seg.tangentEnd = { x: s.tangentEnd.x, y: s.tangentEnd.y };
          network.segments.push(seg);
        }
      }

      // Extract regions (defines fill areas)
      if (vn.regions && vn.regions.length > 0) {
        network.regions = [];
        for (let i = 0; i < vn.regions.length; i++) {
          const r = vn.regions[i];
          const region = {};
          if (r.windingRule) region.windingRule = r.windingRule;
          if (r.loops && r.loops.length > 0) {
            region.loops = JSON.parse(JSON.stringify(r.loops));
          }
          if (r.fills && r.fills.length > 0) {
            const rFills = [];
            for (const f of r.fills) {
              const sp = await serializePaint(f);
              if (sp) rFills.push(sp);
            }
            if (rFills.length > 0) region.fills = rFills;
          }
          network.regions.push(region);
        }
      }

      if (network.vertices && network.vertices.length > 0) {
        data.vectorNetwork = network;
      }
    } catch (e) {}
  }

  // Fill properties (including Gradients & Images)
  if (Array.isArray(node.fills) && node.fills.length > 0) {
    const sFills = [];
    for (const f of node.fills) {
      const sp = await serializePaint(f);
      if (sp) sFills.push(sp);
    }
    if (sFills.length > 0) data.fills = sFills;
  } else if (node.type === 'TEXT') {
    try {
      const firstFill = node.getRangeFills(0, Math.min(1, (node.characters || '').length));
      if (Array.isArray(firstFill) && firstFill.length > 0) {
        const sFills = [];
        for (const f of firstFill) {
          const sp = await serializePaint(f);
          if (sp) sFills.push(sp);
        }
        if (sFills.length > 0) data.fills = sFills;
      }
    } catch (e) {}
  }

  // Preserve relativeTransform matrix for flips, shears, and 2D transforms
  if (node.relativeTransform) {
    try { data.relativeTransform = JSON.parse(JSON.stringify(node.relativeTransform)); } catch (e) {}
  }

  // Preserve Figma Arc tool parameters (startingAngle, endingAngle, innerRadius) for Ellipse nodes
  if (node.type === 'ELLIPSE' && node.arcData) {
    try {
      data.arcData = {
        startingAngle: node.arcData.startingAngle,
        endingAngle: node.arcData.endingAngle,
        innerRadius: node.arcData.innerRadius
      };
    } catch (e) {}
  }

  // Preserve stroke dash patterns
  if (Array.isArray(node.dashPattern) && node.dashPattern.length > 0) {
    try { data.dashPattern = JSON.parse(JSON.stringify(node.dashPattern)); } catch (e) {}
  }

  // Stroke properties (including Gradients)
  if (Array.isArray(node.strokes) && node.strokes.length > 0) {
    const sStrokes = [];
    for (const s of node.strokes) {
      const sp = await serializePaint(s);
      if (sp) sStrokes.push(sp);
    }
    if (sStrokes.length > 0) data.strokes = sStrokes;
    data.strokeWeight = node.strokeWeight;
    data.strokeAlign = node.strokeAlign;
    // strokeCap/strokeJoin can be figma.mixed (Symbol) when endpoints differ — only save when string
    if (typeof node.strokeCap === 'string') data.strokeCap = node.strokeCap;
    if (typeof node.strokeJoin === 'string') data.strokeJoin = node.strokeJoin;
  }

  // Effects
  if (Array.isArray(node.effects) && node.effects.length > 0) {
    data.effects = node.effects.map(e => serializeEffect(e)).filter(Boolean);
  }
  // Container specific (Frame, Group, Component, Instance, Component Set, Section, Boolean Operation)
  const containerTypes = ['FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION', 'BOOLEAN_OPERATION'];
  if (containerTypes.includes(node.type)) {
    const isFlex = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(node.type);
    data.layoutMode = isFlex ? (node.layoutMode || 'NONE') : 'NONE';
    data.clipsContent = isFlex ? !!node.clipsContent : false;
    data.itemSpacing = isFlex ? (node.itemSpacing || 0) : 0;
    data.paddingLeft = isFlex ? (node.paddingLeft || 0) : 0;
    data.paddingRight = isFlex ? (node.paddingRight || 0) : 0;
    data.paddingTop = isFlex ? (node.paddingTop || 0) : 0;
    data.paddingBottom = isFlex ? (node.paddingBottom || 0) : 0;
    data.counterAxisSpacing = isFlex ? (node.counterAxisSpacing || 0) : 0;
    data.primaryAxisAlignItems = isFlex ? (node.primaryAxisAlignItems || 'MIN') : 'MIN';
    data.counterAxisAlignItems = isFlex ? (node.counterAxisAlignItems || 'MIN') : 'MIN';
    data.primaryAxisSizingMode = isFlex ? (node.primaryAxisSizingMode || 'FIXED') : 'FIXED';
    data.counterAxisSizingMode = isFlex ? (node.counterAxisSizingMode || 'FIXED') : 'FIXED';
    if (node.type === 'BOOLEAN_OPERATION') {
      data.booleanOperation = node.booleanOperation;
    }

    // Serialize children
    if (node.children && node.children.length > 0) {
      data.children = [];
      for (const child of node.children) {
        const childData = await serializeNode(child, depth + 1);
        if (childData) data.children.push(childData);
      }
    }
  }

  return data;
}

let cachedAvailableFonts = null;

async function loadFontSafely(fontName) {
  if (fontName && fontName.family && fontName.style) {
    try {
      await figma.loadFontAsync(fontName);
      return fontName;
    } catch (e) {}

    // Try alternate styles for the target font family (e.g., 'Regular', 'Medium', 'Bold', 'SemiBold', 'Light', 'Book', 'Roman', 'Italic')
    const stylesToTry = ['Regular', 'Medium', 'Bold', 'SemiBold', 'Light', 'Book', 'Roman', 'Italic'];
    for (const style of stylesToTry) {
      try {
        const candidate = { family: fontName.family, style };
        await figma.loadFontAsync(candidate);
        return candidate;
      } catch (e) {}
    }

    // Search user's installed available fonts in Figma for a family match
    try {
      if (!cachedAvailableFonts) {
        cachedAvailableFonts = await figma.listAvailableFontsAsync();
      }
      if (Array.isArray(cachedAvailableFonts) && cachedAvailableFonts.length > 0) {
        const match = cachedAvailableFonts.find(f => f.fontName && f.fontName.family.toLowerCase() === fontName.family.toLowerCase());
        if (match) {
          try {
            await figma.loadFontAsync(match.fontName);
            return match.fontName;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // Universal fallbacks guaranteed to exist in Figma
  const fallbacks = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
    { family: 'Arial', style: 'Regular' }
  ];

  for (const fallback of fallbacks) {
    try {
      await figma.loadFontAsync(fallback);
      return fallback;
    } catch (e) {}
  }

  // Last resort: pick the very first available font in Figma!
  try {
    if (!cachedAvailableFonts) {
      cachedAvailableFonts = await figma.listAvailableFontsAsync();
    }
    if (Array.isArray(cachedAvailableFonts) && cachedAvailableFonts.length > 0) {
      await figma.loadFontAsync(cachedAvailableFonts[0].fontName);
      return cachedAvailableFonts[0].fontName;
    }
  } catch (e) {}

  return null;
}

function applyTextNodeProperties(node, data) {
  if (!node || node.type !== 'TEXT' || !data) return;

  try {
    if (data.fontSize !== undefined) node.fontSize = data.fontSize;
    if (data.fontName) node.fontName = data.fontName;
    if (data.textAlignHorizontal !== undefined) node.textAlignHorizontal = data.textAlignHorizontal;
    if (data.textAlignVertical !== undefined) node.textAlignVertical = data.textAlignVertical;
    if (data.textAutoResize !== undefined) node.textAutoResize = data.textAutoResize;
    if (data.letterSpacing) node.letterSpacing = data.letterSpacing;
    if (data.lineHeight) node.lineHeight = data.lineHeight;
    if (data.paragraphSpacing !== undefined) node.paragraphSpacing = data.paragraphSpacing;
    if (data.paragraphIndent !== undefined) node.paragraphIndent = data.paragraphIndent;
    if (data.textDecoration !== undefined) node.textDecoration = data.textDecoration;
    if (data.textTransform !== undefined) node.textTransform = data.textTransform;
    if (data.textCase !== undefined) node.textCase = data.textCase;
    if (data.leadingTrim !== undefined) {
      try { node.leadingTrim = data.leadingTrim; } catch (e) {}
    }
    if (data.constraints) {
      node.constraints = data.constraints;
    }
    if (data.layoutAlign !== undefined) node.layoutAlign = data.layoutAlign;
    if (data.layoutGrow !== undefined) node.layoutGrow = data.layoutGrow;
    if (data.layoutSizingHorizontal !== undefined) node.layoutSizingHorizontal = data.layoutSizingHorizontal;
    if (data.layoutSizingVertical !== undefined) node.layoutSizingVertical = data.layoutSizingVertical;
    if (data.layoutPositioning !== undefined) node.layoutPositioning = data.layoutPositioning;
    if (data.resizeHeight !== undefined) node.resizeHeight = data.resizeHeight;
    if (data.resizeWidth !== undefined) node.resizeWidth = data.resizeWidth;

    if (data.width !== undefined && data.height !== undefined) {
      if (data.textAutoResize === 'HEIGHT') {
        node.resize(data.width, node.height);
      } else if (data.textAutoResize === 'WIDTH') {
        node.resize(node.width, data.height);
      } else if (data.textAutoResize === 'NONE' || data.textAutoResize === undefined) {
        node.resize(data.width, data.height);
      }
    }
  } catch (e) {}
}

// Recreate node tree from serialized JSON
async function deserializeNode(data, parent = null) {
  if (!data || !data.type) return null;

  let node;
  let childrenData = data.children || [];
  let importedFromSvg = false;

  // For GROUP nodes, restore children first and only use SVG as a fallback.
  if (data.type === 'GROUP') {
    const children = [];
    if (childrenData.length > 0) {
      for (const childData of childrenData) {
        const child = await deserializeNode(childData, null);
        if (child) children.push(child);
      }
    }

    if (children.length > 0) {
      node = figma.group(children, figma.currentPage);
    } else if (data.svgMarkup) {
      try {
        const importedNode = figma.createNodeFromSvg(data.svgMarkup);
        if (importedNode) {
          node = importedNode;
          importedFromSvg = true;
        }
      } catch (e) {
        try { await recordSvgFailure(data.svgMarkup, e && e.message ? e.message : String(e)); } catch (er) {}
        node = null;
      }
    }

    if (!node) {
      // Create as frame if no children to avoid group() error
      node = figma.createFrame();
    }
  } else {
    // Create node based on type — ALWAYS use native Figma nodes first, SVG only as last resort
    if (data.type === 'FRAME') {
      node = figma.createFrame();
      try { node.fills = []; } catch (e) {}
    } else if (data.type === 'COMPONENT') {
      node = figma.createComponent();
      try { node.fills = []; } catch (e) {}
    } else if (data.type === 'INSTANCE' || data.type === 'SECTION' || data.type === 'COMPONENT_SET') {
      node = figma.createFrame();
      try { node.fills = []; } catch (e) {}
    } else if (data.type === 'SLICE') {
      try {
        node = figma.createSlice();
      } catch (e) {
        node = figma.createFrame();
        try { node.fills = []; } catch (e) {}
      }
    } else if (data.type === 'TEXT') {
      node = figma.createText();
    } else if (data.type === 'RECTANGLE') {
      node = figma.createRectangle();
    } else if (data.type === 'ELLIPSE') {
      node = figma.createEllipse();
      if (data.arcData) {
        try {
          node.arcData = {
            startingAngle: data.arcData.startingAngle,
            endingAngle: data.arcData.endingAngle,
            innerRadius: data.arcData.innerRadius
          };
        } catch (e) {}
      }
    } else if (data.type === 'POLYGON') {
      node = figma.createPolygon();
      if (data.pointCount !== undefined) node.pointCount = data.pointCount;
    } else if (data.type === 'STAR') {
      node = figma.createStar();
      if (data.pointCount !== undefined) node.pointCount = data.pointCount;
      if (data.innerRadius !== undefined) node.innerRadius = data.innerRadius;
      if (data.outerRadius !== undefined) node.outerRadius = data.outerRadius;
    } else if (data.type === 'LINE' || data.type === 'VECTOR') {
      node = data.type === 'LINE' ? figma.createLine() : figma.createVector();
      let vectorRestored = false;

      // Resize vector/line FIRST so paths render in the correct coordinate space
      if (data.width !== undefined && data.height !== undefined) {
        try { node.resize(data.width, data.height); } catch (e) {}
      }

      // PRIMARY: vectorNetwork — preserves per-vertex strokeCap (LINE_ARROW, TRIANGLE_ARROW etc.)
      if (data.vectorNetwork && data.vectorNetwork.vertices && data.vectorNetwork.vertices.length > 0) {
        try {
          node.vectorNetwork = data.vectorNetwork;
          vectorRestored = true;
        } catch (e) {}
      }

      // FALLBACK 1: vectorPaths
      if (!vectorRestored && data.vectorPaths && data.vectorPaths.length > 0) {
        try {
          node.vectorPaths = data.vectorPaths;
          vectorRestored = true;
        } catch (e) {}
      }

      // FALLBACK 2: SVG import + flatten (last resort)
      if (!vectorRestored && data.svgMarkup) {
        try {
          if (node && typeof node.remove === 'function') node.remove();
          const importedNode = figma.createNodeFromSvg(data.svgMarkup);
          if (importedNode) {
            try {
              const flattened = figma.flatten([importedNode]);
              if (flattened) {
                node = flattened;
                importedFromSvg = true;
              } else {
                importedNode.remove();
                node = data.type === 'LINE' ? figma.createLine() : figma.createVector();
              }
            } catch (flatErr) {
              node = importedNode;
              importedFromSvg = true;
            }
          } else {
            node = data.type === 'LINE' ? figma.createLine() : figma.createVector();
          }
        } catch (e) {
          node = data.type === 'LINE' ? figma.createLine() : figma.createVector();
        }
      }
    } else if (data.type === 'BOOLEAN_OPERATION') {
      // Boolean operations: SVG import + flatten for exact visual match
      if (data.svgMarkup) {
        try {
          const importedNode = figma.createNodeFromSvg(data.svgMarkup);
          if (importedNode) {
            try {
              const flattened = figma.flatten([importedNode]);
              if (flattened) {
                node = flattened;
                importedFromSvg = true;
              } else {
                importedNode.remove();
              }
            } catch (flattenErr) {
              // If flatten fails, use the wrapper frame as-is
              node = importedNode;
              importedFromSvg = true;
            }
          }
        } catch (e) {
          try { await recordSvgFailure(data.svgMarkup, e && e.message ? e.message : String(e)); } catch (er) {}
        }
      }
      if (!node) {
        node = figma.createBooleanOperation();
        if (data.booleanOperation) {
          node.booleanOperation = data.booleanOperation;
        }
      }
    } else {
      // Safe fallback for any unknown node type to avoid return null and throwing restore error
      node = figma.createFrame();
      try { node.fills = []; } catch (e) {}
    }

    // Configure Auto Layout properties on container node BEFORE children are appended
    if (node && (node.type === 'FRAME' || node.type === 'COMPONENT')) {
      try {
        if (data.layoutMode) node.layoutMode = data.layoutMode;
        if (data.clipsContent !== undefined) node.clipsContent = data.clipsContent;
        if (data.itemSpacing !== undefined) node.itemSpacing = data.itemSpacing;
        if (data.paddingLeft !== undefined) node.paddingLeft = data.paddingLeft;
        if (data.paddingRight !== undefined) node.paddingRight = data.paddingRight;
        if (data.paddingTop !== undefined) node.paddingTop = data.paddingTop;
        if (data.paddingBottom !== undefined) node.paddingBottom = data.paddingBottom;
        if (data.counterAxisSpacing !== undefined) node.counterAxisSpacing = data.counterAxisSpacing;
        if (data.primaryAxisAlignItems) node.primaryAxisAlignItems = data.primaryAxisAlignItems;
        if (data.counterAxisAlignItems) node.counterAxisAlignItems = data.counterAxisAlignItems;
        if (data.primaryAxisSizingMode) node.primaryAxisSizingMode = data.primaryAxisSizingMode;
        if (data.counterAxisSizingMode) node.counterAxisSizingMode = data.counterAxisSizingMode;
      } catch (e) {}
    }

    // Resize container node BEFORE deserializing children so parent bounds are accurate
    try {
      if (data.width !== undefined && data.height !== undefined && node && typeof node.resize === 'function') {
        node.resize(data.width, data.height);
      }
    } catch (e) {}

    // Recursively create children for container nodes (if not created directly from SVG)
    if (node && !importedFromSvg && (data.type === 'FRAME' || data.type === 'COMPONENT' || data.type === 'INSTANCE' || data.type === 'SECTION' || data.type === 'BOOLEAN_OPERATION') && childrenData.length > 0) {
      for (const childData of childrenData) {
        const child = await deserializeNode(childData, node);
        if (child) {
          try {
            node.appendChild(child);

            // Re-enforce child Auto Layout sizing after appending to an active Auto Layout parent
            if (childData.layoutSizingHorizontal !== undefined && child.layoutSizingHorizontal !== undefined) {
              child.layoutSizingHorizontal = childData.layoutSizingHorizontal;
            }
            if (childData.layoutSizingVertical !== undefined && child.layoutSizingVertical !== undefined) {
              child.layoutSizingVertical = childData.layoutSizingVertical;
            }
            if (childData.layoutAlign !== undefined && child.layoutAlign !== undefined) {
              child.layoutAlign = childData.layoutAlign;
            }
            if (childData.layoutGrow !== undefined && child.layoutGrow !== undefined) {
              child.layoutGrow = childData.layoutGrow;
            }
            if (childData.layoutPositioning !== undefined && child.layoutPositioning !== undefined) {
              child.layoutPositioning = childData.layoutPositioning;
            }
          } catch (e) {}
        }
      }
    }
  }

  // ─── Apply Common Properties to ALL Nodes ───

  // Basic properties
  try {
    if (data.name) node.name = data.name;
    if (data.visible !== undefined) node.visible = data.visible;
    if (data.locked !== undefined) node.locked = data.locked;
    if (data.opacity !== undefined) node.opacity = Math.min(1, Math.max(0, data.opacity));
    if (data.blendMode && node.blendMode !== undefined) node.blendMode = data.blendMode;
    if (data.isMask !== undefined) {
      try { node.isMask = data.isMask; } catch (e) {}
    }
    if (data.maskType !== undefined && node.maskType !== undefined) {
      try { node.maskType = data.maskType; } catch (e) {}
    }
  } catch (e) {}

  // Position and transform
  try {
    if (data.relativeTransform && node.relativeTransform !== undefined) {
      try { node.relativeTransform = data.relativeTransform; } catch (e) {
        if (data.rotation !== undefined && node.rotation !== undefined) node.rotation = data.rotation;
      }
    } else if (data.rotation !== undefined && node.rotation !== undefined) {
      node.rotation = data.rotation;
    }
    // Skip setting x/y directly on GROUP nodes because figma.group(children) auto-positions
    if (data.x !== undefined && node.x !== undefined && data.type !== 'GROUP') node.x = data.x;
    if (data.y !== undefined && node.y !== undefined && data.type !== 'GROUP') node.y = data.y;
  } catch (e) {}

  // Constraints
  try {
    if (data.constraints && node.constraints !== undefined) {
      node.constraints = {
        horizontal: data.constraints.horizontal,
        vertical: data.constraints.vertical
      };
    }
  } catch (e) {}

  // Final resize (except for VECTOR nodes where vectorPaths define the size)
  try {
    if (data.width !== undefined && data.height !== undefined && typeof node.resize === 'function') {
      if (node.type !== 'VECTOR' && node.type !== 'BOOLEAN_OPERATION') {
        node.resize(data.width, data.height);
      }
    }
  } catch (e) {}

  // Auto Layout child sizing & positioning
  try {
    if (data.layoutPositioning !== undefined && node.layoutPositioning !== undefined) {
      node.layoutPositioning = data.layoutPositioning;
    }
    if (data.layoutAlign !== undefined && node.layoutAlign !== undefined) {
      node.layoutAlign = data.layoutAlign;
    }
    if (data.layoutGrow !== undefined && node.layoutGrow !== undefined) {
      node.layoutGrow = data.layoutGrow;
    }
    if (data.layoutSizingHorizontal !== undefined && node.layoutSizingHorizontal !== undefined) {
      node.layoutSizingHorizontal = data.layoutSizingHorizontal;
    }
    if (data.layoutSizingVertical !== undefined && node.layoutSizingVertical !== undefined) {
      node.layoutSizingVertical = data.layoutSizingVertical;
    }
  } catch (e) {}

  // Rounded corner properties (FRAME, COMPONENT, INSTANCE, RECTANGLE, VECTOR)
  try {
    const supportsCornerRadius = ['FRAME', 'RECTANGLE', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET', 'VECTOR'].includes(node.type);
    if (supportsCornerRadius) {
      // Apply individual corner radii first for mixed-radius nodes
      if (typeof data.topLeftRadius === 'number') {
        try { node.topLeftRadius = data.topLeftRadius; } catch (e) {}
      }
      if (typeof data.topRightRadius === 'number') {
        try { node.topRightRadius = data.topRightRadius; } catch (e) {}
      }
      if (typeof data.bottomRightRadius === 'number') {
        try { node.bottomRightRadius = data.bottomRightRadius; } catch (e) {}
      }
      if (typeof data.bottomLeftRadius === 'number') {
        try { node.bottomLeftRadius = data.bottomLeftRadius; } catch (e) {}
      }
      // Only apply uniform cornerRadius if individual corners weren't set
      if (typeof data.cornerRadius === 'number' && data.topLeftRadius === undefined && data.topRightRadius === undefined && data.bottomRightRadius === undefined && data.bottomLeftRadius === undefined) {
        try { node.cornerRadius = data.cornerRadius; } catch (e) {}
      }
      if (typeof data.cornerSmoothing === 'number') {
        try { node.cornerSmoothing = data.cornerSmoothing; } catch (e) {}
      }
    }
  } catch (e) {}

  // Text properties
  if (node.type === 'TEXT') {
    try {
      const loadedFont = await loadFontSafely(data.fontName);
      if (loadedFont) {
        try { node.fontName = loadedFont; } catch (e) {}
      }

      applyTextNodeProperties(node, data);
      if (data.characters !== undefined) {
        node.characters = data.characters;
      }
      if (data.x !== undefined) node.x = data.x;
      if (data.y !== undefined) node.y = data.y;
    } catch (e) {}
  }

  // Fills and Strokes — always apply for native nodes, skip only for SVG-imported nodes
  if (!importedFromSvg) {
    // Set strokes empty if none saved
    if (!data.strokes || data.strokes.length === 0) {
      try { node.strokes = []; } catch (e) {}
    }

    // Fills (including Gradients & Images)
    if (data.fills && data.fills.length > 0) {
      try {
        node.fills = data.fills.map(f => deserializePaint(f)).filter(Boolean);
      } catch (e) {}
    } else {
      if (['FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'BOOLEAN_OPERATION', 'VECTOR', 'LINE', 'COMPONENT', 'INSTANCE', 'SECTION', 'COMPONENT_SET'].includes(node.type)) {
        try { node.fills = []; } catch (e) {}
      }
    }

    // Strokes (including Gradients & Dash patterns)
    if (data.strokes && Array.isArray(data.strokes) && data.strokes.length > 0) {
      try {
        const activeStrokes = data.strokes.filter(s => s && s.visible !== false && (s.opacity === undefined || s.opacity > 0)).map(s => deserializePaint(s)).filter(Boolean);
        if (activeStrokes.length > 0) {
          node.strokes = activeStrokes;
          if (data.strokeWeight !== undefined) node.strokeWeight = data.strokeWeight;
          if (data.strokeAlign) node.strokeAlign = data.strokeAlign;
          // Only set node-level strokeCap if vectorNetwork was NOT used (to avoid wiping out per-vertex start/end caps like LINE_ARROW)
          if (typeof data.strokeCap === 'string' && (!data.vectorNetwork || !data.vectorNetwork.vertices)) {
            try { node.strokeCap = data.strokeCap; } catch (e) {}
          }
          if (typeof data.strokeJoin === 'string') {
            try { node.strokeJoin = data.strokeJoin; } catch (e) {}
          }
          if (data.dashPattern && Array.isArray(data.dashPattern) && data.dashPattern.length > 0 && node.dashPattern !== undefined) {
            try { node.dashPattern = data.dashPattern; } catch (e) {}
          }
        } else {
          node.strokes = [];
        }
      } catch (e) {}
    } else {
      try { node.strokes = []; } catch (e) {}
    }
  }

  // Effects
  if (data.effects && Array.isArray(data.effects) && data.effects.length > 0) {
    try {
      node.effects = data.effects.map(e => deserializeEffect(e)).filter(Boolean);
    } catch (e) {}
  }

  return node;
}

async function loadFooterStyles() {
  await loadLocalFolders();

  try {
    const stored = await figma.clientStorage.getAsync(DRIVE_SETTINGS_STORAGE_KEY);
    if (stored && stored.driveConfig && stored.driveConfig.rememberDriveSettings) {
      driveConfig.folderId = stored.driveConfig.folderId || DEFAULT_FOLDER_ID;
      driveConfig.token = stored.driveConfig.token || null;
      driveConfig.refreshToken = stored.driveConfig.refreshToken || DEFAULT_REFRESH_TOKEN;
      driveConfig.clientId = stored.driveConfig.clientId || DEFAULT_CLIENT_ID;
      driveConfig.clientSecret = stored.driveConfig.clientSecret || DEFAULT_CLIENT_SECRET;
      driveConfig.tokenExpiresAt = stored.driveConfig.tokenExpiresAt ? Number(stored.driveConfig.tokenExpiresAt) : 0;
      driveConfig.indexFileId = stored.driveConfig.indexFileId || null;
      driveConfig.userEmail = stored.driveConfig.userEmail || null;
      driveConfig.rememberDriveSettings = true;
      driveConfig.rememberToken = stored.driveConfig.rememberToken !== undefined ? !!stored.driveConfig.rememberToken : true;
      driveConfig.rememberRefreshToken = stored.driveConfig.rememberRefreshToken !== undefined ? !!stored.driveConfig.rememberRefreshToken : true;
      driveConfig.rememberClientId = stored.driveConfig.rememberClientId !== undefined ? !!stored.driveConfig.rememberClientId : true;
      driveConfig.rememberClientSecret = stored.driveConfig.rememberClientSecret !== undefined ? !!stored.driveConfig.rememberClientSecret : true;
    }
  } catch (e) {
    // Ignore storage read errors and continue with drive config as-is.
  }

  if (!driveConfig.clientId) driveConfig.clientId = DEFAULT_CLIENT_ID;
  if (!driveConfig.clientSecret) driveConfig.clientSecret = DEFAULT_CLIENT_SECRET;
  if (!driveConfig.refreshToken) driveConfig.refreshToken = DEFAULT_REFRESH_TOKEN;
  if (!driveConfig.folderId) driveConfig.folderId = DEFAULT_FOLDER_ID;

  const selectedFrame = getSelectedFrameInfo();
  const isCustomDrive = driveConfig.refreshToken && driveConfig.refreshToken !== DEFAULT_REFRESH_TOKEN;
  if (isCustomDrive) {
    try {
      await ensureDriveAccessToken();
      const idx = await driveLoadIndex();
      if (Array.isArray(idx.folders) && idx.folders.length > 0) {
        footerFolders = mergeFolders(footerFolders, idx.folders);
        await saveLocalFolders();
      }
      try {
        const aboutRes = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)', { method: 'GET' });
        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          if (aboutData && aboutData.user && aboutData.user.emailAddress) {
            driveConfig.userEmail = aboutData.user.emailAddress;
            await saveDriveSettings();
          }
        }
      } catch (e) {}
      safePostMessage({ type: 'drive-connected', driveConfig });
    } catch (err) {
      console.log('Drive connection sync warning:', err.message);
    }
  }

  safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });
}

async function createFolder(name) {
  if (!isProUser && footerFolders.length >= 2) {
    safePostMessage({
      type: 'pro-limit-reached',
      limitType: 'folder',
      message: '⚠️ Free Tier Limit: You can create at most 2 collections. Upgrade to Pro for unlimited collections!'
    });
    return;
  }
  console.log('[BACKEND] createFolder starting for name:', name);
  const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const folder = {
    folderId,
    name: name || 'New Folder',
    archived: false,
    createdAt: new Date().toISOString(),
    styles: []
  };
  footerFolders.push(folder);
  console.log('[BACKEND] footerFolders count:', footerFolders.length);

  // 1. Instant local storage save & UI update (0ms latency!)
  saveLocalFolders();
  const selectedFrame = getSelectedFrameInfo();
  console.log('[BACKEND] Posting style-state to UI');
  safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });

  // 2. Drive index sync in background without blocking UI
  if (driveConfig.token || driveConfig.refreshToken) {
    (async () => {
      try {
        await ensureDriveAccessToken();
        await driveSaveIndex();
      } catch (e) {
        console.log('Postponed Drive index save:', e.message);
      }
    })();
  }

  return folder;
}

function encodeBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64(base64Str) {
  if (!base64Str) return new Uint8Array(0);
  try {
    const binary = atob(base64Str);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    return new Uint8Array(0);
  }
}

function stringToUint8Array(str) {
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      i++;
      const surrogate = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (surrogate >> 18),
        0x80 | ((surrogate >> 12) & 0x3f),
        0x80 | ((surrogate >> 6) & 0x3f),
        0x80 | (surrogate & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

function concatUint8Arrays(arrays) {
  let totalLength = 0;
  for (let i = 0; i < arrays.length; i++) {
    totalLength += arrays[i].length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < arrays.length; i++) {
    result.set(arrays[i], offset);
    offset += arrays[i].length;
  }
  return result;
}

function buildMultipartBody(name, mimeType, bytes, parentFolderId) {
  const boundary = '----AssetsDiaryBoundary' + Date.now();
  const metadata = { name: name };
  if (parentFolderId && parentFolderId !== '1a2bFDQ9TsLEfxVFX4AvDwW31NwI31WuT') {
    metadata.parents = [parentFolderId];
  }
  const delimiter = '--' + boundary + '\r\n';
  const closeDelimiter = '--' + boundary + '--';
  const metadataHeaders = 'Content-Disposition: form-data; name="metadata"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n';
  const fileHeaders = 'Content-Disposition: form-data; name="file"; filename="' + name + '"\r\nContent-Type: ' + mimeType + '\r\n\r\n';

  const body = concatUint8Arrays([
    stringToUint8Array(delimiter + metadataHeaders),
    stringToUint8Array(JSON.stringify(metadata)),
    stringToUint8Array('\r\n' + delimiter + fileHeaders),
    bytes,
    stringToUint8Array('\r\n' + closeDelimiter)
  ]);

  return { body, boundary };
}

function normalizeDriveToken(token) {
  if (!token) return '';
  token = token.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  return token;
}

function isDriveTokenExpired() {
  if (!driveConfig.token) return true;
  if (!driveConfig.tokenExpiresAt) return false;
  return Date.now() >= driveConfig.tokenExpiresAt;
}

async function refreshAccessToken() {
  if (!driveConfig.refreshToken || !driveConfig.clientId || !driveConfig.clientSecret) {
    throw new Error('Missing refresh credentials for Google Token endpoint. Provide client_id, client_secret, and refresh_token.');
  }

  const encode = (value) => encodeURIComponent(value).replace(/%20/g, '+');
  const body = [
    `client_id=${encode(driveConfig.clientId)}`,
    `client_secret=${encode(driveConfig.clientSecret)}`,
    `refresh_token=${encode(driveConfig.refreshToken)}`,
    `grant_type=refresh_token`
  ].join('&');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    const details = json.error_description || json.error || JSON.stringify(json);
    throw new Error('Failed to refresh Google access token: ' + details);
  }

  driveConfig.token = json.access_token;
  driveConfig.tokenExpiresAt = Date.now() + ((json.expires_in || 3600) * 1000) - 60000;
  if (json.refresh_token) {
    driveConfig.refreshToken = json.refresh_token;
  }

  if (driveConfig.rememberDriveSettings) {
    await saveDriveSettings();
  }

  return driveConfig.token;
}



async function ensureDriveAccessToken() {
  const tokenMissingOrExpired = !driveConfig.token || (driveConfig.tokenExpiresAt && Date.now() >= driveConfig.tokenExpiresAt);

  if (tokenMissingOrExpired) {
    if (driveConfig.refreshToken && driveConfig.clientId && driveConfig.clientSecret) {
      return await refreshAccessToken();
    }
    if (!driveConfig.token) {
      throw new Error('Drive access token is missing. Connect Drive with Google OAuth Refresh Credentials (or a live access token).');
    }
    if (driveConfig.tokenExpiresAt && Date.now() >= driveConfig.tokenExpiresAt) {
      throw new Error('Drive access token has expired (tokens expire after 1 hour). Please provide Google OAuth Refresh Token, Client ID, and Secret to stay connected permanently without re-authenticating every hour.');
    }
  }

  return driveConfig.token;
}

async function driveFetch(url, options = {}) {
  const token = normalizeDriveToken(await ensureDriveAccessToken());
  const headers = Object.assign({}, options.headers || {}, { 'Authorization': 'Bearer ' + token });
  const request = Object.assign({}, options, { headers });
  let res = await fetch(url, request);
  if (res.status === 401 && driveConfig.refreshToken && driveConfig.clientId && driveConfig.clientSecret) {
    await refreshAccessToken();
    const retryToken = normalizeDriveToken(driveConfig.token);
    request.headers.Authorization = 'Bearer ' + retryToken;
    res = await fetch(url, request);
  }
  return res;
}

async function driveUploadFile(name, mimeType, bytes, parentFolderId) {
  const payload = buildMultipartBody(name, mimeType, bytes, parentFolderId);
  const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
    body: payload.body
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Drive upload failed: ' + res.status + ' ' + body);
  }
  const json = await res.json();
  return json.id;
}

async function driveDeleteFile(fileId) {
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId), {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 404) throw new Error('Drive delete failed: ' + res.status);
}

async function cleanupPartialStyleUpload(style) {
  if (!style) return;
  const ids = [style.driveNodeFileId, style.drivePngFileId, style.driveSvgFileId];
  for (const fileId of ids) {
    if (!fileId) continue;
    try {
      await driveDeleteFile(fileId);
    } catch (e) {
      // ignore cleanup failures, they can be cleaned up later manually
    }
  }
}

async function driveDownloadFileBase64(fileId) {
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', {
    method: 'GET'
  });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  const ab = await res.arrayBuffer();
  return encodeBase64(new Uint8Array(ab));
}

async function driveDownloadFileText(fileId) {
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', {
    method: 'GET'
  });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  return await res.text();
}

async function driveFindIndexFile(filename) {
  try {
    const q = `name = '${filename}' and trashed = false`;
    const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name,parents)&pageSize=1';
    const res = await driveFetch(url, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      if (json.files && json.files.length > 0) return json.files[0];
    }
  } catch (e) {}
  return null;
}

async function driveRebuildIndexFromAssetFiles() {
  if (!driveConfig.token && !driveConfig.refreshToken) return [];
  try {
    await ensureDriveAccessToken();
    const q = `'${driveConfig.folderId}' in parents and name contains 'style-' and name contains '.json' and trashed = false`;
    const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=100';
    const res = await driveFetch(url, { method: 'GET' });
    if (!res.ok) return [];

    const json = await res.json();
    if (!json.files || json.files.length === 0) return [];

    const recoveredStyles = [];

    for (const file of json.files) {
      try {
        const styleId = file.name.replace('.json', '');
        const text = await driveDownloadFileText(file.id);
        if (!text) continue;
        const nodeData = JSON.parse(text);
        
        const pngFile = await driveFindIndexFile(`${styleId}.png`);
        const pngFileId = pngFile ? pngFile.id : null;
        
        const svgFile = await driveFindIndexFile(`${styleId}.svg`);
        const svgFileId = svgFile ? svgFile.id : null;

        recoveredStyles.push({
          styleId,
          name: nodeData.name || 'Saved Element',
          width: nodeData.width || 300,
          height: nodeData.height || 200,
          previewData: nodeData.previewData || null,
          nodeData,
          driveNodeFileId: file.id,
          drivePngFileId: pngFileId,
          driveSvgFileId: svgFileId,
          createdAt: new Date().toISOString()
        });
      } catch (e) {}
    }

    if (recoveredStyles.length > 0) {
      const recoveredFolder = {
        folderId: 'folder-recovered-' + Date.now(),
        name: 'Saved Assets Collection',
        styles: recoveredStyles
      };
      return [recoveredFolder];
    }
  } catch (e) {}
  return [];
}

async function driveReadFoldersFromFile(fileId) {
  if (!fileId) return null;
  try {
    const text = await driveDownloadFileText(fileId);
    if (text && text.trim()) {
      const data = JSON.parse(text);
      if (data) {
        let folders = null;
        if (Array.isArray(data.folders)) {
          folders = data.folders;
        } else if (Array.isArray(data)) {
          folders = data;
        } else if (Array.isArray(data.styles)) {
          folders = [{ folderId: 'folder-1', name: 'My Collection', styles: data.styles }];
        }
        if (folders && folders.length > 0) {
          const totalStyles = folders.reduce((acc, f) => acc + (f.styles ? f.styles.length : 0), 0);
          if (totalStyles > 0 || folders.length > 0) {
            return folders;
          }
        }
      }
    }
  } catch (e) {}
  return null;
}

async function driveLoadIndex() {
  const userPrimary = getUserIndexFilename(currentUser);
  const userBackup = getUserBackupIndexFilename(currentUser);
  const candidates = [
    { name: userPrimary, isUserPrimary: true },
    { name: userBackup, isUserPrimary: true }
  ];

  for (const item of candidates) {
    const file = await driveFindIndexFile(item.name);
    if (file) {
      const folders = await driveReadFoldersFromFile(file.id);
      if (folders && folders.length > 0) {
        const totalStyles = folders.reduce((acc, f) => acc + (f.styles ? f.styles.length : 0), 0);
        if (totalStyles > 0) {
          if (item.isUserPrimary) {
            driveConfig.indexFileId = file.id;
          } else {
            driveConfig.indexFileId = null;
          }
          if (file.parents && file.parents.length > 0) {
            driveConfig.folderId = file.parents[0];
          }
          return { folders };
        }
      }
    }
  }

  const rebuiltFolders = await driveRebuildIndexFromAssetFiles();
  if (rebuiltFolders && rebuiltFolders.length > 0) {
    driveConfig.indexFileId = null;
    return { folders: rebuiltFolders };
  }

  driveConfig.indexFileId = null;
  return { folders: [] };
}

async function driveSaveIndex(overrideData) {
  const isCustomDrive = driveConfig.refreshToken && driveConfig.refreshToken !== DEFAULT_REFRESH_TOKEN;
  if (!isCustomDrive) return;
  try {
    await ensureDriveAccessToken();
    const indexData = overrideData || { folders: footerFolders };
    const data = JSON.stringify(indexData);
    const bytes = stringToUint8Array(data);
    const filename = getUserIndexFilename(currentUser);
    const backupFilename = getUserBackupIndexFilename(currentUser);

    if (driveConfig.indexFileId) {
      try {
        const payload = buildMultipartBody(filename, 'application/json; charset=UTF-8', bytes);
        const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(driveConfig.indexFileId) + '?uploadType=multipart', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'multipart/related; boundary=' + payload.boundary
          },
          body: payload.body
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error('Drive index update failed: ' + res.status + ' ' + body);
        }
      } catch (err) {
        driveConfig.indexFileId = null;
      }
    }

    if (!driveConfig.indexFileId) {
      const existingFile = await driveFindIndexFile(filename);
      if (existingFile) {
        driveConfig.indexFileId = existingFile.id;
        const payload = buildMultipartBody(filename, 'application/json; charset=UTF-8', bytes);
        await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(existingFile.id) + '?uploadType=multipart', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'multipart/related; boundary=' + payload.boundary
          },
          body: payload.body
        });
      } else {
        const payload = buildMultipartBody(filename, 'application/json; charset=UTF-8', bytes, driveConfig.folderId);
        const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/related; boundary=' + payload.boundary
          },
          body: payload.body
        });
        if (res.ok) {
          const json = await res.json();
          driveConfig.indexFileId = json.id;
        }
      }
    }

    try {
      const backupBytes = stringToUint8Array(data);
      const backupFile = await driveFindIndexFile(backupFilename);
      const payload = buildMultipartBody(backupFilename, 'application/json; charset=UTF-8', backupBytes, driveConfig.folderId);
      if (backupFile) {
        await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(backupFile.id) + '?uploadType=multipart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
          body: payload.body
        });
      } else {
        await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
          body: payload.body
        });
      }
    } catch (e) {}
  } catch (err) {}
}

async function deleteFooterStyle(folderId, styleId) {
  let folder = getFolderById(folderId);
  if (!folder && Array.isArray(footerFolders)) {
    folder = footerFolders.find(f => f && f.styles && f.styles.some(s => s.styleId === styleId));
  }
  if (!folder || !folder.styles) return;
  const idx = folder.styles.findIndex(s => s.styleId === styleId);
  if (idx !== -1) {
    const style = folder.styles[idx];
    folder.styles.splice(idx, 1);
    
    await loadLocalTrash();
    trashItems.push({
      trashId: 'trash_style_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      itemType: 'style',
      data: style,
      originalFolderId: folder.folderId,
      originalFolderName: folder.name,
      deletedAt: Date.now()
    });
    await saveLocalTrash();
    await saveLocalFolders();

    safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
    safePostMessage({ type: 'success', message: '✓ Moved frame to Deleted Backup!' });

    const isCustomDrive = driveConfig.refreshToken && driveConfig.refreshToken !== DEFAULT_REFRESH_TOKEN;
    if (isCustomDrive) {
      (async () => {
        try {
          await ensureDriveAccessToken();
          await driveSaveIndex();
        } catch (e) {}
      })();
    }
  }
}

async function deleteMultipleFooterStyles(folderId, styleIds) {
  let folder = getFolderById(folderId);
  if (!folder && Array.isArray(footerFolders)) {
    folder = footerFolders.find(f => f && f.styles && f.styles.some(s => styleIds.includes(s.styleId)));
  }
  if (!folder || !folder.styles || !Array.isArray(styleIds) || styleIds.length === 0) return;

  await loadLocalTrash();
  const deletedStyles = [];
  folder.styles = folder.styles.filter(s => {
    if (styleIds.includes(s.styleId)) {
      deletedStyles.push(s);
      trashItems.push({
        trashId: 'trash_style_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        itemType: 'style',
        data: s,
        originalFolderId: folder.folderId,
        originalFolderName: folder.name,
        deletedAt: Date.now()
      });
      return false;
    }
    return true;
  });

  await saveLocalTrash();
  await saveLocalFolders();
  safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
  safePostMessage({ type: 'success', message: `✓ Moved ${deletedStyles.length} frame(s) to Deleted Backup!` });

  const isCustomDrive = driveConfig.refreshToken && driveConfig.refreshToken !== DEFAULT_REFRESH_TOKEN;
  if (isCustomDrive) {
    (async () => {
      try {
        await ensureDriveAccessToken();
        await driveSaveIndex();
      } catch (e) {}
    })();
  }
}

async function saveSelectedFrameAsStyle(folderId) {
  let folder = getFolderById(folderId);
  if (!folder && footerFolders.length > 0) {
    folder = footerFolders[0];
  }
  if (!folder) {
    if (!isProUser && footerFolders.length >= 2) {
      safePostMessage({
        type: 'pro-limit-reached',
        limitType: 'folder',
        message: '⚠️ Free Tier Limit: Maximum 2 collections allowed. Upgrade to Pro for unlimited collections!'
      });
      return;
    }
    const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    folder = {
      folderId: newFolderId,
      name: 'My Collection',
      archived: false,
      createdAt: new Date().toISOString(),
      styles: []
    };
    footerFolders.push(folder);
  }

  const selection = figma.currentPage.selection;
  if (selection.length !== 1) throw new Error('Please select a single element or frame on the canvas first.');
  const node = selection[0];
  if (!node || typeof node.exportAsync !== 'function') throw new Error('Please select a valid frame or layer to capture.');

  folder.styles = folder.styles || [];
  if (!isProUser && folder.styles.length >= 5) {
    safePostMessage({
      type: 'pro-limit-reached',
      limitType: 'frame',
      message: `⚠️ Free Tier Limit: Maximum 5 frames allowed per collection on Free tier. Upgrade to Pro for unlimited frames!`
    });
    return;
  }
  const frameTitle = node.name || 'Captured Frame';
  const styleId = `style-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Clone the frame, strip all images from the clone, save the clone, delete the clone
  // Original frame on canvas stays completely untouched
  const clone = node.clone();
  figma.currentPage.appendChild(clone);
  removeImageNodesFromTree(clone);

  const [serializedNode, pngBytes] = await Promise.all([
    serializeNode(clone),
    clone.exportAsync({ format: 'PNG' })  // preview from clone (without images)
  ]);

  // Remove the temporary clone
  try { clone.remove(); } catch (e) {}

  const newStyle = {
    styleId,
    canvasNodeId: node.id,
    title: frameTitle,
    createdAt: new Date().toISOString(),
    width: node.width || 0,
    height: node.height || 0,
    nodeData: serializedNode,
    previewData: encodeBase64(pngBytes)
  };

  folder.styles.unshift(newStyle);

  // 1. INSTANT LOCAL SAVE & UI UPDATE (<5ms)
  await saveLocalFolders();
  safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
  safePostMessage({ type: 'code-generated', message: '✓ Selection saved to collection!' });

  // 2. FAIL-SAFE BACKGROUND QUEUE FOR GOOGLE DRIVE SYNC (No data loss ever)
  if (driveConfig.token || driveConfig.refreshToken) {
    enqueuePendingUpload(newStyle).catch(() => {});
  }
}

async function saveSelectedFramesAsStyles(folderId) {
  let folder = getFolderById(folderId);
  if (!folder && footerFolders.length > 0) {
    folder = footerFolders[0];
  }
  if (!folder) {
    const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    folder = {
      folderId: newFolderId,
      name: 'My Collection',
      archived: false,
      createdAt: new Date().toISOString(),
      styles: []
    };
    footerFolders.push(folder);
  }

  const selection = figma.currentPage.selection;
  if (selection.length === 0) throw new Error('Please select one or more elements on the canvas first.');

  const validNodes = selection.filter(n => n && typeof n.exportAsync === 'function');
  if (validNodes.length === 0) throw new Error('Please select one or more valid elements to capture.');

  folder.styles = folder.styles || [];
  if (!isProUser && (folder.styles.length + validNodes.length) > 5) {
    safePostMessage({
      type: 'pro-limit-reached',
      limitType: 'frame',
      message: `⚠️ Free Tier Limit: Maximum 5 frames allowed per collection on Free tier. Upgrade to Pro for unlimited frames!`
    });
    return;
  }
  const framesToSave = validNodes;

  // Clone each frame, strip images from clone, save clone, delete clone
  // Original frames on canvas stay completely untouched
  const newStyles = await Promise.all(framesToSave.map(async (node, i) => {
    const styleId = `style-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;
    
    const clone = node.clone();
    figma.currentPage.appendChild(clone);
    removeImageNodesFromTree(clone);

    const [serializedNode, pngBytes] = await Promise.all([
      serializeNode(clone),
      clone.exportAsync({ format: 'PNG' })  // preview from clone (without images)
    ]);

    try { clone.remove(); } catch (e) {}

    safePostMessage({ type: 'save-progress', current: i + 1, total: framesToSave.length, frameName: node.name });

    return {
      styleId,
      canvasNodeId: node.id,
      title: node.name || `Captured Frame ${i + 1}`,
      createdAt: new Date().toISOString(),
      width: node.width || 0,
      height: node.height || 0,
      nodeData: serializedNode,
      previewData: encodeBase64(pngBytes)
    };
  }));

  for (let i = newStyles.length - 1; i >= 0; i--) {
    folder.styles.unshift(newStyles[i]);
  }

  // 1. INSTANT LOCAL SAVE & UI UPDATE
  await saveLocalFolders();
  safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
  safePostMessage({ type: 'code-generated', message: `✓ Saved ${framesToSave.length} new element(s) to collection!` });

  // 2. FAIL-SAFE BACKGROUND QUEUE FOR GOOGLE DRIVE SYNC
  if (driveConfig.token || driveConfig.refreshToken) {
    for (const st of newStyles) {
      enqueuePendingUpload(st).catch(() => {});
    }
  }
}

async function previewStyle(folderId, styleId) {
  const style = getStyle(folderId, styleId);
  if (!style) return;
  if (style.previewData) {
    safePostMessage({ type: 'preview', styleId, data: style.previewData });
    return;
  }
  if (style.nodeData) {
    try {
      const tempNode = await deserializeNode(style.nodeData);
      tempNode.x = -99999;
      tempNode.y = -99999;
      figma.currentPage.appendChild(tempNode);
      const pngBytes = await tempNode.exportAsync({ format: 'PNG' });
      tempNode.remove();
      const base64 = encodeBase64(pngBytes);
      style.previewData = base64;
      await saveLocalFolders();
      safePostMessage({ type: 'preview', styleId, data: base64 });
      return;
    } catch (e) {}
  }
  if (style.drivePngFileId) {
    try {
      const data = await driveDownloadFileBase64(style.drivePngFileId);
      safePostMessage({ type: 'preview', styleId, data });
    } catch (err) {}
  }
}

async function generateSavedCaptures(folderId, styleIds) {
  if (!Array.isArray(styleIds) || styleIds.length === 0) {
    throw new Error('No frames selected.');
  }

  const createdNodes = [];
  const startX = figma.viewport.center.x;
  const startY = figma.viewport.center.y;
  let currentX = startX;

  for (let i = 0; i < styleIds.length; i++) {
    const styleId = styleIds[i];
    const style = getStyle(folderId, styleId);
    if (!style) continue;
    
    let nodeData = style.nodeData || null;

    if (!nodeData && style.driveNodeFileId) {
      try {
        await ensureDriveAccessToken();
        const jsonText = await driveDownloadFileText(style.driveNodeFileId);
        nodeData = JSON.parse(jsonText);
      } catch (e) {}
    }

    if (!nodeData) continue;

    try {
      const node = await deserializeNode(nodeData);
      if (!node) continue;
      
      figma.currentPage.appendChild(node);
      node.x = currentX;
      node.y = startY - node.height / 2;
      currentX += node.width + 40; // 40px gap between restored frames
      createdNodes.push(node);
    } catch (err) {}
  }

  if (createdNodes.length === 0) {
    throw new Error('Failed to restore selected capture(s) onto canvas.');
  }

  // Center all created nodes as a group horizontally in viewport
  const totalWidth = currentX - startX - 40;
  const offsetX = totalWidth / 2;
  for (const node of createdNodes) {
    node.x -= offsetX;
  }

  function uncheckDropShadowsOnSubtree(targetNode) {
    if (!targetNode) return;
    try {
      if (targetNode.effects && Array.isArray(targetNode.effects) && targetNode.effects.length > 0) {
        const hasDropShadow = targetNode.effects.some(e => e && e.type === 'DROP_SHADOW');
        if (hasDropShadow) {
          const updatedEffects = targetNode.effects.map(e => {
            if (e && e.type === 'DROP_SHADOW') {
              const copy = JSON.parse(JSON.stringify(e));
              copy.showShadowBehindNode = false;
              return copy;
            }
            return e;
          });
          targetNode.effects = updatedEffects;
        }
      }
    } catch (e) {}

    if (targetNode.children && targetNode.children.length > 0) {
      for (const child of targetNode.children) {
        uncheckDropShadowsOnSubtree(child);
      }
    }
  }

  for (const node of createdNodes) {
    uncheckDropShadowsOnSubtree(node);
  }

  figma.currentPage.selection = createdNodes;
  figma.viewport.scrollAndZoomIntoView(createdNodes);

  // Force Figma Inspector property pane refresh
  setTimeout(() => {
    try {
      for (const node of createdNodes) {
        uncheckDropShadowsOnSubtree(node);
      }
      figma.currentPage.selection = [];
      figma.currentPage.selection = createdNodes;
    } catch (e) {}
  }, 50);

  safePostMessage({ type: 'success' });
}

// ── User Registry & Auth Logic ────────────────────────
const ADMIN_EMAIL = 'lybonerik@gmail.com';
const ADMIN_PASSWORD = 'mnkjKJMN123';

async function syncUsersRegistryToDrive(registryData) {
  if (!driveConfig.token && !driveConfig.refreshToken) return;
  try {
    await ensureDriveAccessToken();
    const data = JSON.stringify(registryData || []);
    const bytes = stringToUint8Array(data);

    const primaryFile = await driveFindIndexFile('assets-diary-users-registry.json');
    if (primaryFile) {
      const payload = buildMultipartBody('assets-diary-users-registry.json', 'application/json; charset=UTF-8', bytes);
      await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(primaryFile.id) + '?uploadType=multipart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
        body: payload.body
      });
    } else {
      const payload = buildMultipartBody('assets-diary-users-registry.json', 'application/json; charset=UTF-8', bytes, driveConfig.folderId);
      await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
        body: payload.body
      });
    }

    try {
      const backupFile = await driveFindIndexFile('assets-diary-users-registry-backup.json');
      const payload = buildMultipartBody('assets-diary-users-registry-backup.json', 'application/json; charset=UTF-8', bytes, driveConfig.folderId);
      if (backupFile) {
        await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(backupFile.id) + '?uploadType=multipart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
          body: payload.body
        });
      } else {
        await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
          body: payload.body
        });
      }
    } catch (e) {}
  } catch (e) {}
}

async function fetchUsersRegistryFromDrive() {
  if (!driveConfig.token && !driveConfig.refreshToken) return [];
  try {
    await ensureDriveAccessToken();
    let file = await driveFindIndexFile('assets-diary-users-registry.json');
    if (!file) {
      file = await driveFindIndexFile('assets-diary-users-registry-backup.json');
    }
    if (file) {
      const text = await driveDownloadFileText(file.id);
      if (text && text.trim()) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {}
  return [];
}

async function getLocalUsersRegistry() {
  try {
    let registry = await figma.clientStorage.getAsync(USERS_REGISTRY_KEY);
    if (!Array.isArray(registry) || registry.length === 0) {
      registry = await figma.clientStorage.getAsync(USERS_REGISTRY_BACKUP_KEY);
    }
    if (Array.isArray(registry)) return registry;
  } catch (e) {}
  return [];
}

async function getAllUsersRegistry() {
  const localRegistry = await getLocalUsersRegistry();

  let cloudRegistry = [];
  try {
    cloudRegistry = await fetchUsersRegistryFromDrive();
  } catch (e) {}

  const mergedMap = new Map();

  mergedMap.set(ADMIN_EMAIL.toLowerCase(), {
    uid: 'usr_admin_lybonerik',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z'
  });

  for (const user of [...localRegistry, ...cloudRegistry]) {
    if (user && user.email) {
      const key = user.email.toLowerCase();
      if (!mergedMap.has(key) || user.role === 'admin') {
        mergedMap.set(key, user);
      }
    }
  }

  const mergedRegistry = Array.from(mergedMap.values());

  try {
    await figma.clientStorage.setAsync(USERS_REGISTRY_KEY, mergedRegistry);
    await figma.clientStorage.setAsync(USERS_REGISTRY_BACKUP_KEY, mergedRegistry);
  } catch (e) {}

  syncUsersRegistryToDrive(mergedRegistry).catch(() => {});

  return mergedRegistry;
}

async function registerUserInRegistry(email, password, name) {
  if (!email || !password) throw new Error('Please enter both email and password.');
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (normalizedPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const registry = await getAllUsersRegistry();
  const existing = registry.find(u => u.email && u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
  const uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const displayName = (name && name.trim()) ? name.trim() : email.split('@')[0];
  const newUser = {
    uid,
    email: email.trim(),
    name: displayName,
    password: normalizedPassword,
    role: isAdmin ? 'admin' : 'user',
    createdAt: new Date().toISOString()
  };

  registry.push(newUser);
  await figma.clientStorage.setAsync(USERS_REGISTRY_KEY, registry);
  await figma.clientStorage.setAsync(USERS_REGISTRY_BACKUP_KEY, registry);
  
  syncUsersRegistryToDrive(registry).catch(() => {});
  return newUser;
}

async function authenticateUser(email, password) {
  if (!email || !password) throw new Error('Please enter both email and password.');
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
    if (normalizedPassword !== ADMIN_PASSWORD) {
      throw new Error('Incorrect password for admin account.');
    }
    return {
      uid: 'usr_admin_lybonerik',
      email: ADMIN_EMAIL,
      name: 'Admin',
      role: 'admin'
    };
  }

  // 1. Fast check local storage registry (<5ms)
  let registry = await getLocalUsersRegistry();
  let user = registry.find(u => u.email && u.email.toLowerCase() === normalizedEmail);

  // 2. Fallback check merged/cloud registry if not found locally
  if (!user) {
    registry = await getAllUsersRegistry();
    user = registry.find(u => u.email && u.email.toLowerCase() === normalizedEmail);
  }

  if (!user) {
    throw new Error('No account found with this email. Please click "Create Account" below to register.');
  }

  if (user.password !== normalizedPassword) {
    throw new Error('Incorrect password. Please check your credentials and try again.');
  }

  return {
    uid: user.uid,
    email: user.email,
    name: user.name || user.email.split('@')[0],
    role: user.role || 'user'
  };
}

async function handleGetAdminData() {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Unauthorized access. Admin privileges required.');
  }

  const registry = await getAllUsersRegistry();
  const allUsersData = [];
  let totalFoldersCount = 0;
  let totalStylesCount = 0;

  for (const user of registry) {
    let userFolders = [];
    if (currentUser && user.uid === currentUser.uid && footerFolders && footerFolders.length > 0) {
      userFolders = footerFolders;
    } else {
      try {
        const key = getStorageKeyForUser(user);
        let stored = await figma.clientStorage.getAsync(key);
        if (!Array.isArray(stored) || stored.length === 0) {
          stored = await figma.clientStorage.getAsync(LOCAL_FOLDERS_STORAGE_KEY);
        }
        if (Array.isArray(stored) && stored.length > 0) {
          userFolders = stored;
        }

        if ((!userFolders || userFolders.length === 0) && (driveConfig.token || driveConfig.refreshToken)) {
          let userIdxFile = await driveFindIndexFile(getUserIndexFilename(user));
          if (!userIdxFile) {
            userIdxFile = await driveFindIndexFile('assets-diary-index.json');
          }
          if (userIdxFile) {
            const text = await driveDownloadFileText(userIdxFile.id);
            if (text && text.trim()) {
              const data = JSON.parse(text);
              if (data && Array.isArray(data.folders)) {
                userFolders = data.folders;
              }
            }
          }
        }
        if ((!userFolders || userFolders.length === 0) && (driveConfig.token || driveConfig.refreshToken)) {
          userFolders = await driveRebuildIndexFromAssetFiles();
        }
      } catch (e) {}
    }

    let userStylesCount = 0;
    userFolders.forEach(f => {
      if (f.styles && Array.isArray(f.styles)) userStylesCount += f.styles.length;
    });

    totalFoldersCount += userFolders.length;
    totalStylesCount += userStylesCount;

    allUsersData.push({
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
        role: user.role || 'user',
        createdAt: user.createdAt
      },
      folders: userFolders,
      foldersCount: userFolders.length,
      stylesCount: userStylesCount
    });
  }

  safePostMessage({
    type: 'admin-data-response',
    totalUsers: registry.length,
    totalFolders: totalFoldersCount,
    totalStyles: totalStylesCount,
    allUsersData
  });
}

figma.ui.onmessage = async (msg) => {
  try {
    if (!msg || !msg.type) return;

    // License Actions
    if (msg.type === 'check-license') {
      try {
        let storedKey = await figma.clientStorage.getAsync(LICENSE_KEY_STORAGE_KEY);
        isProUser = !!(storedKey && storedKey.trim());
        safePostMessage({ type: 'license-status', active: isProUser, isPro: isProUser, key: storedKey || '' });
      } catch (e) {
        isProUser = false;
        safePostMessage({ type: 'license-status', active: false, isPro: false, key: '' });
      }
      return;
    }
    if (msg.type === 'save-license') {
      try {
        await figma.clientStorage.setAsync(LICENSE_KEY_STORAGE_KEY, msg.key);
        isProUser = true;
        safePostMessage({ type: 'license-status', active: true, isPro: true, key: msg.key });
        safePostMessage({ type: 'success', message: '✓ Pro License Activated! All limits removed.' });
      } catch (e) {}
      return;
    }
    if (msg.type === 'deactivate-license') {
      try {
        await figma.clientStorage.setAsync(LICENSE_KEY_STORAGE_KEY, null);
        isProUser = false;
        safePostMessage({ type: 'license-status', active: false, isPro: false, key: '' });
        safePostMessage({ type: 'success', message: 'License deactivated.' });
      } catch (e) {}
      return;
    }

    // Auth Actions
    if (msg.type === 'check-auth') {
      try {
        let user = null;
        if (figma.currentUser) {
          const isAdmin = figma.currentUser.name === 'lybonerik' || figma.currentUser.id === '1129375176527581566';
          user = {
            uid: 'figma_' + figma.currentUser.id,
            email: figma.currentUser.name + '@figma.user',
            name: figma.currentUser.name,
            role: isAdmin ? 'admin' : 'user'
          };
        } else {
          let localUid = await figma.clientStorage.getAsync('assets-diary-persistent-uid');
          if (!localUid) {
            localUid = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            await figma.clientStorage.setAsync('assets-diary-persistent-uid', localUid);
          }
          user = {
            uid: localUid,
            email: 'anonymous@local.user',
            name: 'Local User',
            role: 'user'
          };
        }
        currentUser = user;
        await figma.clientStorage.setAsync(USER_SESSION_KEY, currentUser);
        await loadFooterStyles();
        safePostMessage({ type: 'auth-success', user: currentUser, folders: footerFolders });
      } catch (e) {
        safePostMessage({ type: 'auth-success', user: { uid: 'guest', name: 'Guest' }, folders: [] });
      }
      return;
    }
    if (msg.type === 'auth-login') {
      const user = await authenticateUser(msg.email, msg.password);
      currentUser = user;
      footerFolders = [];
      driveConfig.indexFileId = null;
      await figma.clientStorage.setAsync(USER_SESSION_KEY, user);
      if (user.role === 'admin') {
        await figma.clientStorage.setAsync(REMEMBERED_CREDS_KEY, null);
      } else {
        await figma.clientStorage.setAsync(REMEMBERED_CREDS_KEY, { email: msg.email, password: msg.password });
      }
      await loadFooterStyles();
      safePostMessage({ type: 'auth-success', user: currentUser, folders: footerFolders });
      return;
    }
    if (msg.type === 'auth-signup') {
      const user = await registerUserInRegistry(msg.email, msg.password, msg.name);
      currentUser = { uid: user.uid, email: user.email, name: user.name, role: user.role };
      footerFolders = [];
      driveConfig.indexFileId = null;
      await figma.clientStorage.setAsync(USER_SESSION_KEY, currentUser);
      if (user.role === 'admin') {
        await figma.clientStorage.setAsync(REMEMBERED_CREDS_KEY, null);
      } else {
        await figma.clientStorage.setAsync(REMEMBERED_CREDS_KEY, { email: msg.email, password: msg.password });
      }
      await loadFooterStyles();
      safePostMessage({ type: 'auth-success', user: currentUser, folders: footerFolders });
      return;
    }
    if (msg.type === 'auth-logout') {
      const wasAdmin = currentUser && currentUser.role === 'admin';
      currentUser = null;
      footerFolders = [];
      driveConfig.indexFileId = null;
      await figma.clientStorage.setAsync(USER_SESSION_KEY, null);
      let remembered = await figma.clientStorage.getAsync(REMEMBERED_CREDS_KEY);
      if (wasAdmin || (remembered && remembered.email && remembered.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
        remembered = null;
        await figma.clientStorage.setAsync(REMEMBERED_CREDS_KEY, null);
      }
      safePostMessage({ type: 'auth-logout-success', rememberedCreds: remembered });
      return;
    }
    if (msg.type === 'get-admin-data') {
      await handleGetAdminData();
      return;
    }

    // App Actions
    if (msg.type === 'request-styles') {
      if (!footerFolders || footerFolders.length === 0) {
        await loadLocalFolders();
      }
      const selectedFrame = getSelectedFrameInfo();
      safePostMessage({ type: 'style-state', folders: footerFolders, user: currentUser, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });
      return;
    }
    if (msg.type === 'sync-drive-index') {
      await loadFooterStyles();
      safePostMessage({ type: 'success', message: '✓ Scanned & restored collections from Drive!' });
      return;
    }
    if (msg.type === 'get-svg-failures') {
      try {
        const failures = (await figma.clientStorage.getAsync(SVG_IMPORT_FAILURES_KEY)) || [];
        safePostMessage({ type: 'svg-failures-list', failures });
      } catch (e) {
        safePostMessage({ type: 'svg-failures-list', failures: [] });
      }
      return;
    }
    if (msg.type === 'create-folder') {
      console.log('[BACKEND] Received create-folder message:', msg);
      await createFolder(msg.name || 'New Folder');
      return;
    }
    if (msg.type === 'delete-folder') {
      const id = msg.folderId;
      const idx = footerFolders.findIndex(f => f.folderId === id);
      if (idx !== -1) {
        const folder = footerFolders[idx];
        footerFolders.splice(idx, 1);
        
        await loadLocalTrash();
        trashItems.push({
          trashId: 'trash_folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          itemType: 'folder',
          data: folder,
          deletedAt: Date.now()
        });
        await saveLocalTrash();
        await saveLocalFolders();

        const selectedFrame = getSelectedFrameInfo();
        safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });
        safePostMessage({ type: 'success', message: '✓ Moved collection to Trashcan!' });

        if (driveConfig.token || driveConfig.refreshToken) {
          (async () => {
            try {
              await ensureDriveAccessToken();
              await driveSaveIndex();
            } catch (e) {}
          })();
        }
      }
      return;
    }
    if (msg.type === 'delete-folders-batch') {
      const idsToDelete = new Set(msg.folderIds || []);
      await loadLocalTrash();
      footerFolders = footerFolders.filter(f => {
        if (idsToDelete.has(f.folderId)) {
          trashItems.push({
            trashId: 'trash_folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            itemType: 'folder',
            data: f,
            deletedAt: Date.now()
          });
          return false;
        }
        return true;
      });

      await saveLocalTrash();
      await saveLocalFolders();
      const selectedFrame = getSelectedFrameInfo();
      safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });
      safePostMessage({ type: 'success', message: `✓ Moved ${idsToDelete.size} collection(s) to Trashcan.` });
      if (driveConfig.token || driveConfig.refreshToken) {
        (async () => {
          try {
            await ensureDriveAccessToken();
            await driveSaveIndex();
          } catch (e) {}
        })();
      }
      return;
    }
    if (msg.type === 'get-trash-items') {
      const items = await loadLocalTrash();
      safePostMessage({ type: 'trash-items-list', items });
      return;
    }
    if (msg.type === 'restore-trash-item') {
      await loadLocalTrash();
      const trashId = msg.trashId;
      const idx = trashItems.findIndex(t => t.trashId === trashId);
      if (idx !== -1) {
        const item = trashItems[idx];
        if (item.itemType === 'folder') {
          const existingIdx = footerFolders.findIndex(f => f.folderId === item.data.folderId);
          if (existingIdx !== -1) {
            footerFolders[existingIdx] = item.data;
          } else {
            footerFolders.push(item.data);
          }
        } else if (item.itemType === 'style') {
          let targetFolder = footerFolders.find(f => f.folderId === item.originalFolderId);
          if (!targetFolder) {
            targetFolder = footerFolders.find(f => f.name === 'Restored Items');
            if (!targetFolder) {
              targetFolder = {
                folderId: 'folder_restored_' + Date.now(),
                name: 'Restored Items',
                styles: []
              };
              footerFolders.push(targetFolder);
            }
          }
          if (!targetFolder.styles.some(s => s.styleId === item.data.styleId)) {
            targetFolder.styles.push(item.data);
          }
        }

        trashItems.splice(idx, 1);
        await saveLocalTrash();
        await saveLocalFolders();

        // Synchronously save updated index to Google Drive so driveLoadIndex doesn't overwrite restored items
        if (driveConfig.token || driveConfig.refreshToken) {
          try {
            await ensureDriveAccessToken();
            await driveSaveIndex();
          } catch (e) {}
        }

        safePostMessage({ type: 'trash-items-list', items: trashItems });
        safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
        safePostMessage({ type: 'success', message: '✓ Restored item from Trashcan!' });
      }
      return;
    }
    if (msg.type === 'empty-trash') {
      await loadLocalTrash();
      trashItems = [];
      await saveLocalTrash();
      safePostMessage({ type: 'trash-items-list', items: trashItems });
      safePostMessage({ type: 'success', message: '✓ Trashcan emptied.' });
      return;
    }
    if (msg.type === 'set-starter-template') {
      await saveStarterTemplate(footerFolders);
      safePostMessage({ type: 'success', message: '✓ Current collections saved as Default Template for new users!' });
      return;
    }
    if (msg.type === 'clear-starter-template') {
      await figma.clientStorage.setAsync(STARTER_TEMPLATE_STORAGE_KEY, null);
      safePostMessage({ type: 'success', message: '✓ Starter Template cleared.' });
      return;
    }
    if (msg.type === 'export-backup' || msg.type === 'import-backup') {
      if (!isProUser) {
        safePostMessage({
          type: 'pro-limit-reached',
          limitType: 'json-backup',
          message: '⚠️ Offline JSON Backup is a Pro feature. Upgrade to Pro to unlock!'
        });
        return;
      }
    }
    if (msg.type === 'export-backup') {
      const payload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user: currentUser ? currentUser.email : 'local',
        folders: footerFolders,
        trash: trashItems
      };
      safePostMessage({ type: 'export-backup-data', payload });
      return;
    }
    if (msg.type === 'import-backup') {
      if (Array.isArray(msg.folders) && msg.folders.length > 0) {
        footerFolders = sanitizeFolders(msg.folders);
        await saveLocalFolders();
      }
      if (Array.isArray(msg.trash) && msg.trash.length > 0) {
        trashItems = msg.trash;
        await saveLocalTrash();
      }
      safePostMessage({ type: 'style-state', folders: footerFolders, user: currentUser, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
      safePostMessage({ type: 'success', message: '✓ Backup restored successfully!' });
      return;
    }
    if (msg.type === 'delete-trash-permanently') {
      await loadLocalTrash();
      trashItems = trashItems.filter(t => t.trashId !== msg.trashId);
      await saveLocalTrash();
      safePostMessage({ type: 'trash-items-list', items: trashItems });
      safePostMessage({ type: 'success', message: '✓ Permanently deleted from Trashcan.' });
      return;
    }
    if (msg.type === 'rename-folder') {
      const id = msg.folderId;
      const newName = msg.newName || '';
      const folder = getFolderById(id);
      if (folder) {
        folder.name = newName || folder.name;
        saveLocalFolders();
        const selectedFrame = getSelectedFrameInfo();
        safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });
        if (driveConfig.token || driveConfig.refreshToken) {
          (async () => {
            try {
              await ensureDriveAccessToken();
              await driveSaveIndex();
            } catch (e) {}
          })();
        }
      }
      return;
    }
    if (msg.type === 'rename-style') {
      const folderId = msg.folderId;
      const styleId = msg.styleId;
      const newTitle = msg.newName || msg.newTitle || msg.title || '';
      let style = getStyle(folderId, styleId);
      if (!style && Array.isArray(footerFolders)) {
        for (const folder of footerFolders) {
          if (folder && folder.styles) {
            const found = folder.styles.find(s => s.styleId === styleId);
            if (found) { style = found; break; }
          }
        }
      }
      if (style && newTitle.trim()) {
        style.title = newTitle.trim();
        await saveLocalFolders();
        const selectedFrame = getSelectedFrameInfo();
        safePostMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo(), driveConfig });
        safePostMessage({ type: 'success', message: '✓ Frame renamed!' });

        const isCustomDrive = driveConfig.refreshToken && driveConfig.refreshToken !== DEFAULT_REFRESH_TOKEN;
        if (isCustomDrive) {
          (async () => {
            try {
              await ensureDriveAccessToken();
              await driveSaveIndex();
            } catch (e) {}
          })();
        }
      }
      return;
    }
    if (msg.type === 'add-selected-footer' || msg.type === 'add-selected-footers') {
      if (msg.driveToken) driveConfig.token = normalizeDriveToken(msg.driveToken);
      if (msg.refreshToken) driveConfig.refreshToken = msg.refreshToken.trim();
      if (msg.clientId) driveConfig.clientId = msg.clientId.trim();
      if (msg.clientSecret) driveConfig.clientSecret = msg.clientSecret.trim();
      driveConfig.folderId = driveConfig.folderId || null;
      try {
        await ensureDriveAccessToken();
      } catch (e) {
        // Drive access verification failed/skipped, proceed with local save seamlessly
      }
      if (msg.type === 'add-selected-footer') await saveSelectedFrameAsStyle(msg.folderId);
      else await saveSelectedFramesAsStyles(msg.folderId);
      return;
    }
    if (msg.type === 'connect-drive') {
      driveConfig.folderId = driveConfig.folderId || null;
      if (msg.driveToken) driveConfig.token = normalizeDriveToken(msg.driveToken);
      else driveConfig.token = null;
      if (msg.refreshToken) driveConfig.refreshToken = msg.refreshToken.trim();
      if (msg.clientId) driveConfig.clientId = msg.clientId.trim();
      if (msg.clientSecret) driveConfig.clientSecret = msg.clientSecret.trim();
      driveConfig.rememberDriveSettings = !!msg.rememberDriveSettings;
      driveConfig.rememberToken = !!msg.rememberToken;
      driveConfig.rememberRefreshToken = !!msg.rememberRefreshToken;
      driveConfig.rememberClientId = !!msg.rememberClientId;
      driveConfig.rememberClientSecret = !!msg.rememberClientSecret;
      try {
        await ensureDriveAccessToken();
        await driveLoadIndex();
        if (driveConfig.rememberDriveSettings) await saveDriveSettings();
        await loadFooterStyles();
        safePostMessage({ type: 'drive-connected', driveConfig });
      } catch (err) {
        safePostMessage({ type: 'error', message: String(err) });
      }
      return;
    }
    if (msg.type === 'preview') {
      await previewStyle(msg.folderId, msg.styleId);
      return;
    }
    if (msg.type === 'generate') {
      const styleIds = (msg.styleIds && msg.styleIds.length > 0)
        ? msg.styleIds
        : (msg.styleId ? [msg.styleId] : []);
      await generateSavedCaptures(msg.folderId, styleIds);
      return;
    }
    if (msg.type === 'delete-footer-style') {
      await deleteFooterStyle(msg.folderId, msg.styleId);
      return;
    }
    if (msg.type === 'delete-multiple-styles') {
      await deleteMultipleFooterStyles(msg.folderId, msg.styleIds);
      return;
    }
    safePostMessage({ type: 'error', message: 'Unhandled message type: ' + msg.type });
  } catch (err) {
    safePostMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
  }
};

// Throttled selectionchange listener (300ms debounce): Zero lag during active canvas dragging
let selectionTimer = null;
figma.on('selectionchange', () => {
  if (selectionTimer) clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    const selInfo = getSelectedFramesInfo();
    const firstFrame = selInfo.length === 1 ? selInfo[0] : (selInfo.length > 0 ? selInfo[0] : null);
    safePostMessage({
      type: 'selection-state',
      selectedFrame: firstFrame,
      selectedFrames: selInfo,
      canAddSelectedFrame: selInfo.length > 0
    });
  }, 300);
});

// Initialize: load stored user session and user collections
(async function initPluginHost() {
  try {
    let user = null;
    if (figma.currentUser) {
      const isAdmin = figma.currentUser.name === 'lybonerik' || figma.currentUser.id === '1129375176527581566';
      user = {
        uid: 'figma_' + figma.currentUser.id,
        email: figma.currentUser.name + '@figma.user',
        name: figma.currentUser.name,
        role: isAdmin ? 'admin' : 'user'
      };
    } else {
      let localUid = await figma.clientStorage.getAsync('assets-diary-persistent-uid');
      if (!localUid) {
        localUid = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await figma.clientStorage.setAsync('assets-diary-persistent-uid', localUid);
      }
      user = {
        uid: localUid,
        email: 'anonymous@local.user',
        name: 'Local User',
        role: 'user'
      };
    }
    currentUser = user;
    await figma.clientStorage.setAsync(USER_SESSION_KEY, currentUser);
  } catch (e) {}
  safePostMessage({ type: 'user-info', user: currentUser });
  await loadFooterStyles();
  try {
    const items = await loadLocalTrash();
    safePostMessage({ type: 'trash-items-list', items });
  } catch (e) {}
})();
